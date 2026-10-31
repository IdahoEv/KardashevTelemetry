import argparse
import os
import sys
from pathlib import Path

from kardashev_analysis.discord_client import DiscordClient
from kardashev_analysis.fetch import fetch
from kardashev_analysis.ingest import ingest

DEFAULT_DATA_DIR = Path(__file__).resolve().parents[3] / "data"


def _parser():
    parser = argparse.ArgumentParser(prog="kardashev-analysis")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("fetch", help="download Discord attachments into <data>/raw")
    commands.add_parser("ingest", help="build <data>/sessions from <data>/raw")
    return parser


def _run_fetch(data_dir):
    token = os.environ.get("DISCORD_BOT_TOKEN")
    channel_id = os.environ.get("DISCORD_CHANNEL_ID")
    missing = [n for n, v in (("DISCORD_BOT_TOKEN", token), ("DISCORD_CHANNEL_ID", channel_id)) if not v]
    if missing:
        print(f"error: set {', '.join(missing)}", file=sys.stderr)
        return 2
    report = fetch(DiscordClient(token), channel_id, data_dir / "raw")
    print(f"fetched: {report.fetched}")
    return 0


def _run_ingest(data_dir):
    report = ingest(data_dir / "raw", data_dir / "sessions")
    print(f"written: {report.written}")
    print(f"excluded (dev_session): {report.excluded_dev}")
    print(f"skipped (schema_version): {report.skipped_schema}")
    print(f"skipped (unreadable): {report.skipped_invalid}")
    return 0


def main(argv=None):
    args = _parser().parse_args(argv)
    if args.command == "fetch":
        return _run_fetch(args.data_dir)
    return _run_ingest(args.data_dir)
