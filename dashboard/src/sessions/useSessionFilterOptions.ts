import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DEFAULT_SESSION_FILTERS, fetchSessions } from "../api";
import { formatBuild } from "../format";
import { compareVersions } from "./sorting";

export interface BuildOption {
  value: string;
  label: string;
  title?: string;
}

const ALL_SESSIONS_FILTERS = { ...DEFAULT_SESSION_FILTERS, dev: "include" as const };

export function useSessionFilterOptions() {
  const { data, isPending } = useQuery({
    queryKey: ["sessions", ALL_SESSIONS_FILTERS],
    queryFn: () => fetchSessions(ALL_SESSIONS_FILTERS),
  });

  const buildOptions = useMemo<BuildOption[]>(() => {
    if (!data) return [];
    const versions = new Set<string>();
    const commits = new Set<string>();
    for (const session of data.sessions) {
      if (session.build_version) versions.add(session.build_version);
      if (session.build_commit) commits.add(session.build_commit);
    }
    return [
      ...[...versions]
        .sort(compareVersions)
        .map((version) => ({ value: version, label: version })),
      ...[...commits]
        .sort((a, b) => a.localeCompare(b))
        .map((commit) => ({ value: commit, ...formatBuild(null, commit) })),
    ];
  }, [data]);

  const goalOptions = useMemo(() => {
    if (!data) return [];
    const goals = new Set<string>();
    for (const session of data.sessions) {
      for (const goal of session.goals) goals.add(goal);
    }
    return [...goals].sort((a, b) => a.localeCompare(b));
  }, [data]);

  return { buildOptions, goalOptions, isPending };
}
