# KardashevTelemetry

Analysis of playtest telemetry from [Kardashev](https://github.com/IdahoEv/Kardashev). Reads session JSONL, loads it into DuckDB, answers questions about player progress.

**Data contract (source of truth):** Kardashev `docs/telemetry-events.md` (schema version 1). Fixtures and queries here follow it; if they disagree, the Kardashev doc wins.

## Layout

| Path | Contents |
|---|---|
| `analysis/src/kardashev_analysis/` | Python package |
| `analysis/sql/` | DuckDB queries |
| `analysis/tests/` | pytest suite; `fixtures/` holds synthetic sessions |
| `docs/` | Project docs |

A `collector/` directory will be added later.

## Run

Requires [uv](https://docs.astral.sh/uv/). Dependencies are pinned in `uv.lock`.

```
uv sync
uv run pytest      # the test command
```

## Fetch and ingest

```
export DISCORD_BOT_TOKEN=...      # read-only bot token; never commit
export DISCORD_CHANNEL_ID=...
uv run kardashev-analysis fetch   # new attachments -> data/raw/<message_id>_<attachment_id>.jsonl
uv run kardashev-analysis ingest  # data/raw -> data/sessions/<session_id>.jsonl
```

`fetch` is idempotent. `ingest` keeps the largest (then latest) copy per `session_id`, orders rows by `props.tick` then `seq`, excludes `dev_session` sessions (count printed), and skips sessions whose `schema_version` is not 1 with a warning.

## Data hygiene

`data/` and `.scratch/` are gitignored. Real sessions contain `install_id`, `player_name` and stack traces, so they must never be committed. Put downloaded sessions in `data/`. Everything under `analysis/tests/fixtures/` is synthetic.

## Fixtures

| File | Scenario |
|---|---|
| `session_normal.jsonl` | Complete session, G1 and G2, `session_end` |
| `session_dev.jsonl` | `dev_session` flips true at `dev_cheat_used` |
| `session_normal_early.jsonl` | Shorter earlier upload of `session_normal` (same session, cut at G1) |

## CI

`.github/workflows/ci.yml` runs `uv run pytest`. It may show red for GitHub billing reasons, as on Kardashev; run the tests locally.
