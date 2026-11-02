export const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
] as const;

export function seriesColor(slot: number): string {
  return SERIES_COLORS[slot];
}

export const chartTheme = {
  grid: { stroke: "var(--grid)", strokeDasharray: "0", vertical: false },
  axis: {
    stroke: "var(--axis)",
    tick: { fill: "var(--text-muted)", fontSize: 12 },
    tickLine: false,
  },
  tooltip: {
    contentStyle: {
      background: "var(--surface-1)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-2)",
      color: "var(--text-primary)",
      fontSize: "var(--text-sm)",
    },
    labelStyle: { color: "var(--text-secondary)" },
    itemStyle: { color: "var(--text-primary)" },
    cursor: { stroke: "var(--axis)" },
  },
  line: { strokeWidth: 2, dot: false, activeDot: { r: 4, stroke: "var(--surface-1)", strokeWidth: 2 } },
} as const;
