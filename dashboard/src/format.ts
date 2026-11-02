export function formatWallTime(seconds: number): string {
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function formatSimTime(seconds: number | null): string {
  if (seconds === null) return "—";
  const days = seconds / 86_400;
  return `${days.toFixed(1)} days`;
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export interface BuildLabel {
  label: string;
  title?: string;
}

export function formatBuild(version: string | null, commit: string | null): BuildLabel {
  if (version) return { label: version };
  if (commit) return { label: commit.slice(0, 7), title: commit };
  return { label: "—" };
}
