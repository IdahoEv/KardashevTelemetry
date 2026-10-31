from dataclasses import dataclass
from pathlib import Path


@dataclass
class FetchReport:
    fetched: int = 0


def _latest_message_id(raw_dir):
    ids = [int(p.name.split("_", 1)[0]) for p in raw_dir.glob("*_*.jsonl")]
    return str(max(ids)) if ids else None


def fetch(client, channel_id, raw_dir):
    raw_dir = Path(raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)
    report = FetchReport()
    for message in client.list_messages(channel_id, after=_latest_message_id(raw_dir)):
        for attachment in message["attachments"]:
            if not attachment["filename"].endswith(".jsonl"):
                continue
            target = raw_dir / f"{message['id']}_{attachment['id']}.jsonl"
            if target.exists():
                continue
            tmp = target.with_suffix(".jsonl.tmp")
            tmp.write_bytes(client.download(attachment["url"]))
            tmp.replace(target)
            report.fetched += 1
    return report
