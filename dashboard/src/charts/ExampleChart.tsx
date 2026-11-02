import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable, type Column } from "../components/DataTable";
import { chartTheme, seriesColor } from "./chartTheme";
import "./ExampleChart.css";

interface Point {
  day: string;
  windows: number;
  macos: number;
  linux: number;
}

const SERIES = [
  { key: "windows", name: "Windows" },
  { key: "macos", name: "macOS" },
  { key: "linux", name: "Linux" },
] as const;

const DATA: Point[] = [
  { day: "Mon", windows: 42, macos: 18, linux: 7 },
  { day: "Tue", windows: 55, macos: 22, linux: 9 },
  { day: "Wed", windows: 48, macos: 31, linux: 6 },
  { day: "Thu", windows: 61, macos: 27, linux: 12 },
  { day: "Fri", windows: 70, macos: 35, linux: 10 },
  { day: "Sat", windows: 83, macos: 40, linux: 15 },
  { day: "Sun", windows: 77, macos: 38, linux: 13 },
];

const COLUMNS: Column<Point>[] = [
  { key: "day", header: "Day", render: (row) => row.day },
  ...SERIES.map(({ key, name }) => ({
    key,
    header: name,
    numeric: true,
    render: (row: Point) => row[key],
  })),
];

export function ExampleChart() {
  const [asTable, setAsTable] = useState(false);

  return (
    <div className="example-chart">
      <button type="button" className="example-chart__toggle" onClick={() => setAsTable((v) => !v)}>
        {asTable ? "Show chart" : "Show table"}
      </button>
      {asTable ? (
        <DataTable caption="Sessions per day by platform" columns={COLUMNS} rows={DATA} rowKey={(row) => row.day} />
      ) : (
        <div role="img" aria-label="Line chart of sessions per day by platform" className="example-chart__plot">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={DATA} margin={{ top: 8, right: 72, bottom: 0, left: 0 }}>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis dataKey="day" {...chartTheme.axis} />
              <YAxis width={32} axisLine={false} {...chartTheme.axis} />
              <Tooltip {...chartTheme.tooltip} />
              <Legend
                iconType="plainline"
                formatter={(value: string) => <span style={{ color: "var(--text-secondary)" }}>{value}</span>}
              />
              {SERIES.map(({ key, name }, slot) => (
                <Line
                  key={key}
                  dataKey={key}
                  name={name}
                  type="monotone"
                  isAnimationActive={false}
                  stroke={seriesColor(slot)}
                  {...chartTheme.line}
                  label={({ index, x, y }) =>
                    index === DATA.length - 1 ? (
                      <text key={key} x={Number(x) + 8} y={Number(y)} dy={4} fill="var(--text-secondary)" fontSize={12}>
                        {name}
                      </text>
                    ) : (
                      <g key={`${key}-${index}`} />
                    )
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
