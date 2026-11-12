Title: Telemetry upload client: register and upload directly to GCS, with Discord fallback

Milestone: M3

## Context
Client side of the KardashevTelemetry collector (design: `docs/collector-design.md` in IdahoEv/KardashevTelemetry; service: `collector/`). Replaces the Discord webhook upload (closes B58) once the collector is deployed. Until then, Discord uploads must keep working unchanged.

## Acceptance criteria
- Config (build-time or env): `COLLECTOR_URL` and `COLLECTOR_REGISTRATION_KEY`. When `COLLECTOR_URL` is empty, behavior is exactly today's Discord upload. No collector code path runs.
- Uploader interface with two implementations, `DiscordUploader` (existing logic, moved behind the interface) and `CollectorUploader`. Selection happens once at startup from config.
- First consent: `POST {COLLECTOR_URL}/register` with `{install_id}` and header `X-Registration-Key`. Store the returned token next to `install_id`. Registration is idempotent, so retry freely.
- Per upload: `POST /upload-policy` with `Authorization: Bearer <token>` and `{install_id, session_id}`. Then multipart POST to the returned `url` with the returned `fields` plus the file as the last field. Content-Type `application/x-ndjson`.
- Re-upload at checkpoints overwrites the same key (grown file wins). Size cap is server-enforced (default 10 MiB); stop uploading a session that exceeds it.
- Error handling: 401 -> re-register once with jitter, then retry; 403 -> disable collector uploads for the session; 429 and 503 -> back off, retry next checkpoint; network failure -> no crash, no gameplay impact.
- If the collector path fails persistently (more than N consecutive failures) and a Discord webhook is configured, fall back to Discord for that session.
- Tests: uploader selection by config; Discord path unchanged when collector is unset; token storage; 401/403/429/503 handling against a fake HTTP layer.
- Docs: update `docs/telemetry-events.md` upload section. Token and `install_id` are never logged or put in telemetry events.

## Out of scope
Deploying the collector (infra ticket in KardashevTelemetry); removing the Discord uploader (after the collector has run clean for a release).

## Notes
- The registration key ships in the build and is extractable. It is a speed bump, not a secret.
- Rate limits on the service: 10 registers per minute per IP, 60 policies per minute per install.
