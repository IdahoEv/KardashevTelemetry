# Governor context

**Project:** KardashevTelemetry — analysis tooling and (later) a GCP collector for Kardashev game session telemetry (see `CLAUDE.md`).
**People:** Evan Dorn (owner); reviews concept and sanity.

## Key documents
- Tracker: GitHub Issues `IdahoEv/KardashevTelemetry`
- Data contract: Kardashev `docs/telemetry-events.md` (source of truth for the session envelope)

## Repositories
- **KardashevTelemetry** (this repo)
- **Kardashev** (`IdahoEv/Kardashev`) — the game; emits the telemetry. Parent epic: Kardashev Is656 "Telemetry visibility and hosting" (Milestone 3)

## Gated tickets
Tickets labelled `gated` carry their trigger in the body ("Trigger-gated: do not start until …"). Don't start them or offer them in `/pick` until that trigger has fired. When writing a new ticket that must wait, add the label and the trigger line.

## Standing responsibilities
- Link new tickets to the Kardashev epic; put the estimate in the ticket body.
- Issue/PR reference style: see `CLAUDE.md`.
- Tracker ↔ Kardashev Is656 sync: surface drift, don't reconcile silently.
