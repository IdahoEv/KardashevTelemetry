import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api";
import { Card } from "../components/Card";
import { StatTile } from "../components/StatTile";
import { ErrorState, LoadingState } from "../components/states";
import "./pages.css";

export function HealthPage() {
  const { data, error, isPending } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  return (
    <div className="page">
      <h1>Overview</h1>
      {isPending && <LoadingState />}
      {error && <ErrorState title="API unreachable" detail={error.message} />}
      {data && (
        <Card title="API">
          <div className="grid">
            <StatTile label="Status" value={data.status} />
            <StatTile label="Sessions" value={String(data.session_count)} />
          </div>
        </Card>
      )}
    </div>
  );
}
