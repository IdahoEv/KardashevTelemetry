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
| Registration key | `/register` requires `X-Registration-Key`, matched in constant time against `REGISTRATION_KEYS` (comma-separated, from Secret Manager). Shipped in the client build, so extractable: it stops callers who only read the API, not a determined attacker. Rotate by listing old + new, shipping the new build, then dropping the old. Failed attempts consume the per-IP quota, 401 on mismatch. Required at startup |
| Rotation | Secret Manager holds current + previous versions. Verify accepts both, `/register` mints with current. Verify logs the secret version. Drop the old one when old-version traffic is near zero; clients that then get 401 re-register (with jitter). Suspected secret compromise: drop it immediately and accept the re-register wave |
| Revocation | Denylist of `install_id`s in env/secret; checked on `/register` and `/upload-policy`. Stops only honest clients; a revoked install can register a fresh id |
| Policy size cap | `content-length-range` 1..`MAX_UPLOAD_BYTES` (default 10 MiB) |
| Policy expiry | 10 minutes |
| Policy conditions | exact `key`, `content-type: application/x-ndjson`, size range |
| Re-upload | Same key overwrites (last write wins). Bucket soft-delete, 7 days, recovers a truncated or junk overwrite |
| Rate limiting | In-memory fixed window: per `install_id` on `/upload-policy`, per client IP on `/register`. Cloud Run `max-instances` kept low and windows reset on cold start, so limits are approximate. Client IP is the entry Google's frontend appends to `X-Forwarded-For` (second from the right), never the client-supplied leftmost. Precondition: the service sits behind Google's HTTP load balancer (header has at least 2 entries: client, LB); with fewer than two entries the code falls back to the socket peer, so a direct `run.app` deployment shares one `/register` bucket. Limits: 60/min per `install_id`, 10/min per IP (code constants) |
| Status codes | 401 bad or missing token, 403 revoked install (not retryable; client stops uploading), 422 malformed ids, 429 over rate (retry with backoff), 503 signing backend unavailable (retry with backoff) |

## First-consent flow

1. Player consents. The game already holds a random `install_id`.
2. Client calls `POST /register {install_id}` with `X-Registration-Key` and gets `{token}`.
3. Client stores the token locally (next to `install_id`).
4. Per session upload: `POST /upload-policy {install_id, session_id}` with `Authorization: Bearer <token>`. Response is the signed policy (`url`, `fields`).
5. Client POSTs the file to GCS with those fields. Repeat at later checkpoints to overwrite the same key.

`/register` is idempotent: the token is a pure function of `(secret, install_id)`, so re-registering returns the same token until the secret rotates.

## Why service-issued

A secret shipped in the client binary is extractable by anyone, and one leak forces a client release to rotate. With service issuance the signing secret never leaves the server, rotation needs no client release, and registration is a rate-limited choke point.

## Abuse model

| Covered | Not covered |
|---|---|
| Drive-by uploads with no token. Registration by callers without the build's registration key | An attacker who extracts the registration key from a build and registers many fresh `install_id`s (each gets a valid token) |
| Overwriting another install's objects without knowing its `install_id` (ids are random UUIDs, never listed) | Anyone who learns an `install_id` can call `/register` and obtain its token: `install_id` is the credential and the token adds no second factor. It also appears in session data, so uploaded events and shared sessions must be treated as exposing it |
| Oversized uploads (size cap enforced by GCS) | Junk or forged event content within the size cap |
| One install flooding policies (per-install limit) | Distributed floods that stay under per-IP limits |
| Revocation of an honest or buggy install | Revocation of an attacker (fresh ids bypass per-install limits and the denylist) |

Mitigations for the uncovered rows: per-IP limit on `/register` (the real gate against fresh-id minting; the registration key only raises the bar), per-release key rotation, bucket lifecycle rule (delete objects older than 180 days), project budget alerts, `max-instances` cap on Cloud Run. Revisit if abuse appears.

## Cost estimate

Soft-delete adds negligible storage at these volumes. Assumes ~2 MB per session, 3 uploads per session (checkpoints), 1 register per install, analysis downloads each session once. Prices are approximate public list prices; Cloud Run's free tier covers all request volume here.

| | 1k sessions | 10k sessions |
|---|---|---|
| Storage (2 GB / 20 GB standard) | ~$0.04 / month | ~$0.40 / month |
| GCS class A ops (3k / 30k uploads) | ~$0.02 | ~$0.15 |
| Cloud Run requests (~4k / 40k) | $0 (free tier) | $0 (free tier) |
| Secret Manager access (secrets cached at instance start) | $0 | $0 |
| Egress to analysis | ~$0.24 (one-time pull) | ~$2.40 (one-time pull) |
| Total | under $1 | under $5 |

## Open items for follow-up tickets

- Client (Kardashev): store token, call register on first consent, retry policy on 401 (re-register) and 429 (back off).
- Bucket lifecycle rule and budget alert: infra setup, outside the service ticket.
