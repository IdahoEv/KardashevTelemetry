# KardashevTelemetry — Claude Code Guide

## Purpose

Analysis tooling (and later a GCP collector) for session telemetry emitted by the Kardashev game (sibling repo `IdahoEv/Kardashev`). Planned session sources: Discord attachments (Is2), then a GCS bucket (Is7).

## Layout

| Path | Contents |
|---|---|
| `analysis/` | Python package: `src`, `tests` (+ `tests/fixtures/` synthetic sessions), `sql/` canned DuckDB queries |
| `collector/` | FastAPI upload-policy service. Not yet created (Is5); own tests and CI job |
| `docs/` | Design docs (e.g. `collector-design.md` from Is4) |
| `data/` | Local session store. Gitignored |
| `.scratch/` | Throwaway scripts and queries. Gitignored |

## Commands

```bash
uv sync                                  # install pinned deps
uv run pytest -q                         # tests, quiet output
uv run kardashev-analysis fetch          # Discord -> data/raw (needs DISCORD_BOT_TOKEN, DISCORD_CHANNEL_ID)
uv run kardashev-analysis ingest         # data/raw -> data/sessions/<session_id>.jsonl
uv run duckdb -readonly <db> -c "<sql>"  # read-only queries
```

- Always run pytest with `-q`; never verbose, to preserve context.

## Data hygiene

Sessions contain `install_id`, `player_name` and stack traces. Never commit session data, tokens or secrets. `data/` and `.scratch/` stay gitignored. Test fixtures must be synthetic.

## Scratch files

Put ad-hoc scripts, queries and output in `.scratch/`, not `/tmp` and not the repo tree.

## Data contract

Source of truth: Kardashev `docs/telemetry-events.md` (`IdahoEv/Kardashev`). Don't restate the schema here; when it changes there, update fixtures and parsers here.

## Branches and PRs

- Branches created by `/start` (`<N>-<slug>`).
- PR title `Is<N>: <summary>`; body ends with `Closes #N`.
- Merge with real merge commits (no squash, no rebase).
- In prose write `Is<N>` / `PR<N>`; bare `#N` only in `Closes #N`.
