# KardashevTelemetry

Analysis of playtest telemetry from [Kardashev](https://github.com/IdahoEv/Kardashev). Reads session JSONL, loads it into DuckDB, answers questions about player progress.

**Data contract (source of truth):** Kardashev `docs/telemetry-events.md` (schema version 1). Fixtures and queries here follow it; if they disagree, the Kardashev doc wins.

## Layout

| Path | Contents |
|---|---|
| `analysis/src/kardashev_analysis/` | Python package |
| `analysis/sql/` | DuckDB queries |
| `analysis/tests/` | pytest suite; `fixtures/` holds synthetic sessions |
| `dashboard/` | Vite + React + TypeScript dashboard |
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
uv run kardashev-analysis ingest  # data/raw -> data/sessions/ (and data/dev_sessions/)
```

`fetch` is idempotent. `ingest` keeps the largest (then latest) copy per `session_id`, orders rows by `props.tick` then `seq`, writes `dev_session` sessions to `data/dev_sessions/` instead of `data/sessions/` (moving a session whose latest copy flipped), and skips sessions whose `schema_version` is not 1 with a warning.

## Dashboard

Requires Node and yarn.

```
uv run kardashev-analysis serve                  # API at http://127.0.0.1:8000/api/health
yarn --cwd dashboard install
yarn --cwd dashboard dev                         # http://localhost:5173, proxies /api to :8000
yarn --cwd dashboard build && uv run kardashev-analysis serve   # one process serves API + UI
```

`serve` takes `--host` (default `127.0.0.1`), `--port` (default `8000`) and `--data-dir` (default `data/`). Sessions contain `install_id` and `player_name`, so keep the default loopback bind. `GET /api/health` returns `{status, session_count}`, counted from `<data-dir>/sessions/*.jsonl`.

## Queries

`uv run tel --list` lists the canned queries in `analysis/sql/`; `uv run tel <name>` prints one as a table over `data/sessions/*.jsonl`. `--sessions '<glob>'` points it elsewhere.

| Query | Answers |
|---|---|
| `time_to_goal` | Earliest `ticked_time_s` of each `milestone_reached`, per install |
| `session_length` | Length in seconds (`max(t_ms)`) and event count, per session |
| `event_counts` | Events by type |
| `stalls_per_session` | `building_stalled` count, per session |

### Adding a query

1. Add `analysis/sql/<name>.sql`. Read sessions with `read_json_auto('$SESSIONS', union_by_name = true)`; the runner substitutes the glob for `$SESSIONS`. Cast UUID columns with `::varchar`.
2. Add a test in `analysis/tests/test_tel.py` asserting exact rows on the fixtures, and add the name to `test_list_queries_finds_every_sql_file`.

## Data hygiene

`data/` and `.scratch/` are gitignored. Real sessions contain `install_id`, `player_name` and stack traces, so they must never be committed. Put downloaded sessions in `data/`. Everything under `analysis/tests/fixtures/` is synthetic.

## Fixtures

| File | Scenario |
|---|---|
| `session_normal.jsonl` | Complete session, G1 and G2, `session_end` |
| `session_dev.jsonl` | `dev_session` flips true at `dev_cheat_used` |
| `session_stalled.jsonl` | Two `building_stalled`, G1, no `session_end` |
| `session_normal_early.jsonl` | Shorter earlier upload of `session_normal` (same session, cut at G1) |

## CI

`.github/workflows/ci.yml` runs `uv run pytest` (Python job) and dashboard typecheck, lint and Vitest (separate job). It may show red for GitHub billing reasons, as on Kardashev; run the tests locally.
