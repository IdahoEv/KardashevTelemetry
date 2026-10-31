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

`.github/workflows/ci.yml` runs `uv run pytest`. It may show red for GitHub billing reasons, as on Kardashev; run the tests locally.
