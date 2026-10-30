# Governor context

**Project:** KardashevTelemetry — analysis tooling and (later) a GCP collector for Kardashev game session telemetry (see `CLAUDE.md`).
**People:** Evan Dorn (owner); reviews concept and sanity.

## Key documents
- Tracker: GitHub Issues `IdahoEv/KardashevTelemetry`
- Data contract: Kardashev `docs/telemetry-events.md` (source of truth for the session envelope)
- `docs/collector-design.md` — output of Is4; basis for Is5/Is6

## Repositories
- **KardashevTelemetry** (this repo)
- **Kardashev** (`IdahoEv/Kardashev`) — the game; emits the telemetry. Parent epic: Kardashev Is656 "Telemetry visibility and hosting" (Milestone 3)

## Trigger-gated tickets
Do not start, and do not offer in `/pick`, until fired.

| Ticket | Fires when |
|---|---|
| Is4 spike | Any of: release beyond the friends-only cohort; ~30+ sessions to analyze; uploads near Discord's size cap or 429s; need for incremental upload |
| Is5 collector service | Is4 done |
| Is6 GCP infra + WIF deploy | Is4 done (parallel with Is5) |
| Is7 GCS ingest | Is2 done and Is6 bucket exists |
| Is8 BigQuery + Looker | Is6 done and live uploads in bucket; optional if DuckDB queries suffice |

Ungated: Is1 (scaffold), Is2 (Discord ingest), Is3 (DuckDB queries).

## Standing responsibilities
- Link new tickets to the Kardashev epic; put the estimate in the ticket body.
- Issue/PR reference style: see `CLAUDE.md`.
- Tracker ↔ Kardashev Is656 sync: surface drift, don't reconcile silently.
