import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "./api";

export default function App() {
  const { data, error, isPending } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  return (
    <main>
      <h1>Kardashev Telemetry</h1>
      {isPending && <p>Loading…</p>}
      {error && <p role="alert">API unreachable: {error.message}</p>}
      {data && (
        <p>
          API {data.status} · {data.session_count} sessions
        </p>
      )}
    </main>
  );
}
