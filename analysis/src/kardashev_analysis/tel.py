import argparse
import sys
from pathlib import Path

import duckdb

SQL_DIR = Path(__file__).resolve().parents[2] / "sql"
DEFAULT_SESSIONS = "data/sessions/*.jsonl"


class UnknownQuery(Exception):
    pass


def list_queries():
    return sorted(p.stem for p in SQL_DIR.glob("*.sql"))


def run_query(name, sessions=DEFAULT_SESSIONS):
    path = SQL_DIR / f"{name}.sql"
    if name not in list_queries():
        raise UnknownQuery(name)
    sql = path.read_text().replace("$SESSIONS", sessions.replace("'", "''"))
    cursor = duckdb.connect().execute(sql)
    return [col[0] for col in cursor.description], cursor.fetchall()


def format_table(columns, rows):
    cells = [[str(v) for v in row] for row in rows]
    widths = [max([len(c), *(len(r[i]) for r in cells)]) for i, c in enumerate(columns)]
    numeric = [all(isinstance(r[i], (int, float)) for r in rows) and bool(rows)
               for i in range(len(columns))]

    def line(values):
        parts = [v.rjust(w) if num else v.ljust(w)
                 for v, w, num in zip(values, widths, numeric)]
        return "  ".join(parts).rstrip()

    header = line(columns)
    divider = line(["-" * w for w in widths])
    return "\n".join([header, divider, *(line(r) for r in cells)])


def main(argv=None):
    parser = argparse.ArgumentParser(prog="tel", description="Run a canned telemetry query.")
    parser.add_argument("query", nargs="?")
    parser.add_argument("--list", action="store_true", help="list available queries")
    parser.add_argument("--sessions", default=DEFAULT_SESSIONS,
                        help=f"glob of session JSONL files (default: {DEFAULT_SESSIONS})")
    args = parser.parse_args(argv)

    if args.list:
        print("\n".join(list_queries()))
        return 0
    if not args.query:
        parser.error("query name required (see --list)")
    try:
        columns, rows = run_query(args.query, args.sessions)
    except UnknownQuery:
        print(f"tel: unknown query '{args.query}' (see --list)", file=sys.stderr)
        return 2
    except duckdb.Error as e:
        print(f"tel: {e}", file=sys.stderr)
        return 1
    print(format_table(columns, rows))
    return 0
