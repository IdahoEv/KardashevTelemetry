# Collector design

Decision: the service issues install tokens on first consent (`POST /register`), then issues signed GCS POST policies (`POST /upload-policy`). Clients upload directly to GCS. Stateless, no database.

## Decisions

| Topic | Decision |
|---|---|
| Stack | FastAPI on Cloud Run, GCS bucket, Secret Manager, GitHub Actions + Workload Identity Federation |
| Object key | `<install_id>/<session_id>.jsonl` |
| Id format | Lowercase UUID (`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`) for both ids |
| Token source | Issued by the service, not minted from a secret shipped in the client |
| Token format | `v<N>.` + base64url(HMAC-SHA256(secret_vN, install_id)), unpadded |
| Verification | Parse version, look up `secret_vN`, recompute, `hmac.compare_digest` |
| Rotation | Secret Manager holds current + previous versions. Verify accepts both, `/register` mints with current. Drop the old one after clients have re-registered |
| Revocation | Denylist of `install_id`s in env/secret; checked on both endpoints |
| Policy size cap | `content-length-range` 1..`MAX_UPLOAD_BYTES` (default 10 MiB) |
| Policy expiry | 10 minutes |
| Policy conditions | exact `key`, `content-type: application/x-ndjson`, size range |
| Re-upload | Same key overwrites; the grown file wins. No object versioning |
| Rate limiting | In-memory fixed window: per `install_id` on `/upload-policy`, per client IP on `/register`. Cloud Run `max-instances` kept low, so limits are approximate across instances |

## First-consent flow

1. Player consents. The game already holds a random `install_id`.
2. Client calls `POST /register {install_id}` and gets `{token}`.
3. Client stores the token locally (next to `install_id`).
4. Per session upload: `POST /upload-policy {install_id, session_id}` with `Authorization: Bearer <token>`. Response is the signed policy (`url`, `fields`).
5. Client POSTs the file to GCS with those fields. Repeat at later checkpoints to overwrite the same key.

`/register` is idempotent: the token is a pure function of `(secret, install_id)`, so re-registering returns the same token.

## Why service-issued

A secret shipped in the client binary is extractable by anyone, and one leak forces a client release to rotate. With service issuance the signing secret never leaves the server, rotation needs no client release, and registration is a rate-limited choke point.

## Abuse model

| Covered | Not covered |
|---|---|
| Drive-by uploads with no token | An attacker who registers many fresh `install_id`s (each gets a valid token) |
| Overwriting another install's objects without knowing its `install_id` (ids are random UUIDs, never listed) | A leaked `install_id` + token pair, until revoked |
| Oversized uploads (size cap enforced by GCS) | Junk or forged event content within the size cap |
| One install flooding policies (per-install limit) | Distributed floods that stay under per-IP limits |
| Targeted revocation of an install | |

Mitigations for the uncovered rows: per-IP limit on `/register`, bucket lifecycle rule (delete objects older than 180 days), project budget alerts, `max-instances` cap on Cloud Run. Revisit if abuse appears.

## Cost estimate

Assumes ~2 MB per session, 3 uploads per session (checkpoints), 1 register per install, analysis downloads each session once. Prices are approximate public list prices; Cloud Run's free tier covers all request volume here.

| | 1k sessions | 10k sessions |
|---|---|---|
| Storage (2 GB / 20 GB standard) | ~$0.04 / month | ~$0.40 / month |
| GCS class A ops (3k / 30k uploads) | ~$0.02 | ~$0.15 |
| Cloud Run requests (~4k / 40k) | $0 (free tier) | $0 (free tier) |
| Secret Manager access | $0 (free tier) | ~$0.10 |
| Egress to analysis | ~$0.24 (one-time pull) | ~$2.40 (one-time pull) |
| Total | under $1 | under $5 |

## Open items for follow-up tickets

- Client (Kardashev): store token, call register on first consent, retry policy on 401 (re-register) and 429 (back off).
- Bucket lifecycle rule and budget alert: infra setup, outside the service ticket.
