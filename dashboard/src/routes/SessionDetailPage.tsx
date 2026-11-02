import { Link, useParams } from "react-router";
import { EmptyState } from "../components/states";
import "./pages.css";

export function SessionDetailPage() {
  const { sessionId } = useParams();

  return (
    <div className="page">
      <h1>Session</h1>
      <EmptyState
        title="Session detail coming soon"
        hint={`Details for ${sessionId ?? "this session"} will appear here.`}
        action={<Link to="/">Back to sessions</Link>}
      />
    </div>
  );
}
