import type { ReactNode } from "react";
import { type Aggregate, type GoalStats, type SessionFilterParams } from "../api";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { DataTable, type Column } from "../components/DataTable";
import { StatTile } from "../components/StatTile";
import { EmptyState, ErrorState, LoadingState } from "../components/states";
import { formatPercent, formatSimTime, formatWallTime } from "../format";
import { useSessionStats } from "./useSessionStats";
import "./StatsPanel.css";

export const SMALL_N_THRESHOLD = 5;

interface GoalRow extends GoalStats {
  goal: string;
}

const columns: Column<GoalRow>[] = [
  { key: "goal", header: "Goal", render: (row) => row.goal },
  { key: "reached", header: "Reached", numeric: true, render: (row) => row.reached },
  {
    key: "reachRate",
    header: "Rate",
    numeric: true,
    render: (row) => formatPercent(row.reach_rate),
  },
  {
    key: "medianTime",
    header: "Median time to goal",
    numeric: true,
    render: (row) =>
      row.time_to_goal.median === null ? "—" : formatSimTime(row.time_to_goal.median),
  },
  {
    key: "n",
    header: "n",
    numeric: true,
    render: (row) => (
      <>
        {row.time_to_goal.n}
        {row.time_to_goal.n < SMALL_N_THRESHOLD && (
          <Badge tone="warning">low n</Badge>
        )}
      </>
    ),
  },
];

function smallNote(aggregate: Aggregate): ReactNode | undefined {
  if (aggregate.n >= SMALL_N_THRESHOLD) return undefined;
  return (
    <Badge tone="warning">
      n = {aggregate.n}
    </Badge>
  );
}

export function StatsPanel({ filters }: { filters: SessionFilterParams }) {
  const { data, error, isPending } = useSessionStats(filters);

  if (isPending) return <LoadingState label="Loading statistics…" />;
  if (error) return <ErrorState title="Couldn't load statistics" detail={error.message} />;
  if (!data) return null;
  if (data.sessions === 0) {
    return (
      <EmptyState
        title="No sessions to summarize"
        hint="Adjust the filters to include sessions."
      />
    );
  }

  const rows: GoalRow[] = Object.entries(data.goals).map(([goal, stats]) => ({
    goal,
    ...stats,
  }));

  return (
    <div className="stats-panel">
      <div className="grid">
        <StatTile label="Sessions" value={String(data.sessions)} />
        <StatTile
          label="Median wall time"
          value={
            data.wall_time_s.median === null ? "—" : formatWallTime(data.wall_time_s.median)
          }
          note={smallNote(data.wall_time_s)}
        />
        <StatTile
          label="Median sim time"
          value={formatSimTime(data.sim_time_s.median)}
          note={smallNote(data.sim_time_s)}
        />
      </div>
      <Card title="Goals">
        {rows.length === 0 ? (
          <EmptyState title="No goals reached" hint="None of the selected sessions reached a goal." />
        ) : (
          <DataTable
            caption="Goal statistics"
            columns={columns}
            rows={rows}
            rowKey={(row) => row.goal}
          />
        )}
      </Card>
    </div>
  );
}
