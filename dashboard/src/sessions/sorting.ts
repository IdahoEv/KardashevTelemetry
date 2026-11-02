import type { SessionSummary } from "../api";

export function compareVersions(a: string, b: string): number {
  const aSegments = a.split(".");
  const bSegments = b.split(".");
  const length = Math.max(aSegments.length, bSegments.length);
  for (let i = 0; i < length; i++) {
    const aNumeric = numericSegment(aSegments[i]);
    const bNumeric = numericSegment(bSegments[i]);
    if (aNumeric !== null && bNumeric !== null) {
      if (aNumeric !== bNumeric) return aNumeric - bNumeric;
    } else {
      const compared = (aSegments[i] ?? "").localeCompare(bSegments[i] ?? "");
      if (compared !== 0) return compared;
    }
  }
  return 0;
}

function numericSegment(segment: string | undefined): number | null {
  if (segment === undefined || segment === "") return 0;
  return /^\d+$/.test(segment) ? Number(segment) : null;
}

export function compareBuilds(a: string | null, b: string | null): number {
  const aVersion = a === "" ? null : a;
  const bVersion = b === "" ? null : b;
  if (aVersion === bVersion) return 0;
  if (aVersion === null) return -1;
  if (bVersion === null) return 1;
  return compareVersions(aVersion, bVersion);
}

export function compareNullableText(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a.localeCompare(b);
}

export function compareSimTime(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a - b;
}

export function sortSessionsDefault(sessions: SessionSummary[]): SessionSummary[] {
  return [...sessions].sort((a, b) => {
    const byBuild = compareBuilds(a.build_version, b.build_version);
    if (byBuild !== 0) return -byBuild;
    if (a.wall_time_s !== b.wall_time_s) return b.wall_time_s - a.wall_time_s;
    return a.session_id.localeCompare(b.session_id);
  });
}
