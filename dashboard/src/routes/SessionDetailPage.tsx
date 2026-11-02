import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { fetchSessionDetail } from "../api";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState, ErrorState, LoadingState } from "../components/states";
import { type GoalTime } from "../api";
import { formatBuild, formatSimTime, formatWallTime } from "../format";
import { GoalTimeline } from "../sessions/GoalTimeline";
import "./pages.css";
import "./SessionDetailPage.css";

const columns: Column<GoalTime>[] = [
  { key: "goal", header: "Goal", render: (row) => row.goal },
  {
    key: "simTime",
    header: "Sim time",
    numeric: true,
    render: (row) => formatSimTime(row.sim_time_s),
  },
];

function backAction(href: string) {
  return (
    <Link className="session-detail__back" to={href}>
      ← Back to sessions
    </Link>
  );
}

export function SessionDetailPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const listUrl = searchParams.toString() ? `/?${searchParams}` : "/";
  const backLink = backAction(listUrl);

  const { data, error, isPending } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => fetchSessionDetail(sessionId!),
    enabled: sessionId !== undefined,
  });

  const goalTimes = useMemo(
    () => [...(data?.goal_times ?? [])].sort((a, b) => a.sim_time_s - b.sim_time_s),
    [data],
  );

  if (sessionId === undefined) {
    return (
      <div className="page">
        <ErrorState title="No session requested" action={backLink} />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="page">
        {backLink}
        <LoadingState label="Loading session…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        {backLink}
        <ErrorState title="Couldn't load session" detail={error.message} action={backLink} />
      </div>
    );
  }

  if (data === null || data === undefined) {
    return (
      <div className="page">
        {backLink}
        <EmptyState
          title="Session not found"
          hint="This session doesn't exist in the store."
          action={backLink}
        />
      </div>
    );
  }

  const build = formatBuild(data.build_version, data.build_commit);

  return (
    <div className="page session-detail">
      <div className="session-detail__header">
        {backLink}
        <h1 className={data.player_name ? undefined : "sessions-link--unnamed"}>
          {data.player_name ?? "Unnamed"}
        </h1>
        <div className="session-detail__meta">
          <span title={build.title}>{build.label}</span>
          <span>{formatWallTime(data.wall_time_s)} wall</span>
          <span>{formatSimTime(data.sim_time_s)} sim</span>
          {data.dev && <Badge tone="warning">Dev</Badge>}
          <Badge tone={data.ended ? "good" : "neutral"}>{data.ended ? "Ended" : "In progress"}</Badge>
        </div>
      </div>
      <Card title="Goals">
        {goalTimes.length === 0 ? (
          <EmptyState
            title="No goals reached"
            hint="This session ended before reaching a milestone."
          />
        ) : (
          <>
            <DataTable
              caption="Time to each goal"
              columns={columns}
              rows={goalTimes}
              rowKey={(row) => row.goal}
            />
            <GoalTimeline times={goalTimes} />
          </>
        )}
      </Card>
      <Card title="Buildings">
        {/* Is25: buildings chart mounts here, consuming detail.buildings
            ({ types, series }) with charts/chartTheme.ts + Recharts. */}
        <div data-slot="buildings-chart">
          <EmptyState
            title="Buildings chart coming soon"
            hint="Built structures over sim time arrives in Is25."
          />
        </div>
      </Card>
    </div>
  );
}
