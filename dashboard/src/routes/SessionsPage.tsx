import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { fetchSessions, type SessionSummary } from "../api";
import { Card } from "../components/Card";
import { DataTable, type Column, type SortState } from "../components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../components/states";
import { formatBuild, formatSimTime, formatWallTime } from "../format";
import { SessionFilterBar } from "../sessions/SessionFilterBar";
import { StatsPanel } from "../sessions/StatsPanel";
import {
  compareNullableText,
  compareSessionBuilds,
  compareSimTime,
  sortSessionsDefault,
} from "../sessions/sorting";
import { useSessionFilterOptions } from "../sessions/useSessionFilterOptions";
import { useSessionFilters } from "../sessions/useSessionFilters";
import "./pages.css";
import "./SessionsPage.css";

const columns: Column<SessionSummary>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (row) => (
      <Link
        className={row.player_name ? undefined : "sessions-link--unnamed"}
        to={`/sessions/${row.session_id}`}
      >
        {row.player_name ?? "Unnamed"}
      </Link>
    ),
  },
  {
    key: "wallTime",
    header: "Wall time",
    numeric: true,
    sortable: true,
    render: (row) => formatWallTime(row.wall_time_s),
  },
  {
    key: "simTime",
    header: "Sim time",
    numeric: true,
    sortable: true,
    render: (row) => formatSimTime(row.sim_time_s),
  },
  {
    key: "lastGoal",
    header: "Last goal",
    sortable: true,
    render: (row) => row.last_goal ?? "—",
  },
  {
    key: "build",
    header: "Build",
    sortable: true,
    render: (row) => {
      const build = formatBuild(row.build_version, row.build_commit);
      return build.title ? <span title={build.title}>{build.label}</span> : build.label;
    },
  },
];

const comparators: Record<string, (a: SessionSummary, b: SessionSummary) => number> = {
  name: (a, b) => compareNullableText(a.player_name, b.player_name),
  wallTime: (a, b) => a.wall_time_s - b.wall_time_s,
  simTime: (a, b) => compareSimTime(a.sim_time_s, b.sim_time_s),
  lastGoal: (a, b) => compareNullableText(a.last_goal, b.last_goal),
  build: compareSessionBuilds,
};

function columnIsNumeric(key: string): boolean {
  return columns.find((column) => column.key === key)?.numeric ?? false;
}

export function SessionsPage() {
  const { filters, hasActiveFilters, setDev, setName, toggleBuild, toggleReached, clear } =
    useSessionFilters();
  const { data, error, isPending } = useQuery({
    queryKey: ["sessions", filters],
    queryFn: () => fetchSessions(filters),
    placeholderData: keepPreviousData,
  });
  const { buildOptions, goalOptions } = useSessionFilterOptions();
  const [sort, setSort] = useState<SortState | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    if (!sort) return sortSessionsDefault(data.sessions);
    const comparator = comparators[sort.key];
    if (!comparator) return sortSessionsDefault(data.sessions);
    const direction = sort.direction === "desc" ? -1 : 1;
    return [...data.sessions].sort((a, b) => direction * comparator(a, b));
  }, [data, sort]);

  function handleSortToggle(key: string) {
    setSort((current) => {
      if (current?.key !== key) {
        return { key, direction: columnIsNumeric(key) ? "desc" : "asc" };
      }
      return { key, direction: current.direction === "asc" ? "desc" : "asc" };
    });
  }

  return (
    <div className="page">
      <h1>Sessions</h1>
      <SessionFilterBar
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onDevChange={setDev}
        onNameCommit={setName}
        onBuildToggle={toggleBuild}
        onGoalToggle={toggleReached}
        onClear={clear}
        buildOptions={buildOptions}
        goalOptions={goalOptions}
      />
      <StatsPanel filters={filters} />
      {isPending && <LoadingState label="Loading sessions…" />}
      {error && <ErrorState title="Couldn't load sessions" detail={error.message} />}
      {data && !error && (
        data.total_unfiltered === 0 ? (
          <EmptyState title="No sessions yet" hint="Ingest a session file and refresh." />
        ) : (
          <>
            <p className="sessions-count">
              {data.total} of {data.total_unfiltered} sessions
            </p>
            {data.total === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  title="No sessions match these filters"
                  hint="Try clearing or widening the filters."
                />
              ) : (
                <EmptyState
                  title="No sessions to show"
                  hint="Dev builds are excluded by default."
                />
              )
            ) : (
              <Card title="Sessions">
                <DataTable
                  caption="Sessions"
                  columns={columns}
                  rows={rows}
                  rowKey={(row) => row.session_id}
                  sort={sort}
                  onSortToggle={handleSortToggle}
                />
              </Card>
            )}
          </>
        )
      )}
    </div>
  );
}
