import { ExampleChart } from "../charts/ExampleChart";
import { SERIES_COLORS } from "../charts/chartTheme";
import { Badge, type BadgeTone } from "../components/Badge";
import { Card } from "../components/Card";
import { DataTable, type Column } from "../components/DataTable";
import { StatTile } from "../components/StatTile";
import { EmptyState, ErrorState, LoadingState } from "../components/states";
import "./pages.css";

interface Row {
  id: string;
  build: string;
  sessions: number;
  status: BadgeTone;
}

const ROWS: Row[] = [
  { id: "a", build: "0.14.2", sessions: 412, status: "good" },
  { id: "b", build: "0.14.1", sessions: 96, status: "warning" },
  { id: "c", build: "0.13.9", sessions: 12, status: "critical" },
];

const COLUMNS: Column<Row>[] = [
  { key: "build", header: "Build", render: (row) => row.build },
  { key: "sessions", header: "Sessions", numeric: true, render: (row) => row.sessions },
  { key: "status", header: "Health", render: (row) => <Badge tone={row.status}>{row.status}</Badge> },
];

const TONES: BadgeTone[] = ["neutral", "good", "warning", "serious", "critical"];

export function StyleguidePage() {
  return (
    <div className="page">
      <h1>Styleguide</h1>

      <Card title="Type">
        <h1>Heading 1</h1>
        <h2>Heading 2</h2>
        <h3>Heading 3</h3>
        <p>Body text for explanations and descriptions.</p>
      </Card>

      <Card title="Categorical palette">
        <div className="swatches">
          {SERIES_COLORS.map((color, i) => (
            <div key={color} className="swatch">
              <div className="swatch__chip" style={{ background: color }} />
              series-{i + 1}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Badge">
        <div className="stack">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Card>

      <Card title="StatTile">
        <div className="grid">
          <StatTile label="Sessions" value="1,284" />
          <StatTile label="Crash rate" value="0.8%" delta="0.3 pt" trend="down" tone="good" />
          <StatTile label="Median session" value="42 min" delta="6 min" trend="up" tone="bad" />
        </div>
      </Card>

      <Card title="DataTable">
        <DataTable caption="Sessions by build" columns={COLUMNS} rows={ROWS} rowKey={(row) => row.id} />
      </Card>

      <Card title="States">
        <div className="grid">
          <LoadingState />
          <EmptyState title="No sessions yet" hint="Run ingest to load sessions." />
          <ErrorState title="API unreachable" detail="health request failed: 500" />
        </div>
      </Card>

      <Card title="Chart">
        <ExampleChart />
      </Card>
    </div>
  );
}
