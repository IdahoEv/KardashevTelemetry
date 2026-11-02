import { useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BuildingsData, GoalTime } from "../api";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState } from "../components/states";
import { formatDayTick, formatSimTime } from "../format";
import { buildChartModel, summarizeBuildings, type ChartRow, type ChartSeries } from "./buildingsSeries";
import { chartTheme, seriesColor } from "./chartTheme";
import "./BuildingsChart.css";

const SECONDS_PER_DAY = 86_400;
const LABEL_LANES = 3;

type Texture = "solid" | "hatch-up" | "hatch-down" | "dots";
const TEXTURES: Texture[] = ["solid", "hatch-up", "hatch-down", "dots"];

function textureFor(slot: number): Texture {
  return TEXTURES[slot % TEXTURES.length];
}

function TextureOverlay({ texture }: { texture: Texture }) {
  const ink = { stroke: "var(--surface-1)", strokeOpacity: 0.55, strokeWidth: 1.5 };
  if (texture === "hatch-up") return <path d="M-1,7 l8,-8 M-1,1 l2,-2 M5,9 l2,-2" {...ink} />;
  if (texture === "hatch-down") return <path d="M-1,-1 l8,8 M-1,5 l2,2 M5,-3 l2,2" {...ink} />;
  if (texture === "dots") return <circle cx="3" cy="3" r="1.3" fill="var(--surface-1)" fillOpacity={0.6} />;
  return null;
}

function Swatch({ slot }: { slot: number }) {
  const id = `swatch-${useId().replace(/:/g, "")}`;
  return (
    <svg className="buildings-chart__swatch" width="14" height="14" aria-hidden="true">
      <defs>
        <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={seriesColor(slot)} />
          <TextureOverlay texture={textureFor(slot)} />
        </pattern>
      </defs>
      <rect width="14" height="14" rx="2" fill={`url(#${id})`} />
    </svg>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: ChartRow }[];
  series: ChartSeries[];
}

function BuildingsTooltip({ active, payload, series }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || row === undefined) return null;
  const total = series.reduce((sum, s) => sum + row.counts[s.key], 0);
  return (
    <div className="buildings-chart__tooltip">
      <div className="buildings-chart__tooltip-title">{formatSimTime(row.day * SECONDS_PER_DAY)}</div>
      {[...series].reverse().map((s) => (
        <div key={s.key} className="buildings-chart__tooltip-row">
          <Swatch slot={s.slot} />
          <span>{s.name}</span>
          <span className="buildings-chart__tooltip-value">{row.counts[s.key]}</span>
        </div>
      ))}
      <div className="buildings-chart__tooltip-row buildings-chart__tooltip-total">
        <span />
        <span>Total</span>
        <span className="buildings-chart__tooltip-value">{total}</span>
      </div>
    </div>
  );
}

interface GoalLabelProps {
  viewBox?: { x?: number };
  lane: number;
  text: string;
}

function GoalLabel({ viewBox, lane, text }: GoalLabelProps) {
  return (
    <text x={(viewBox?.x ?? 0) + 4} y={10 + lane * 14} fill="var(--text-secondary)" fontSize={11}>
      {text}
    </text>
  );
}

interface Props {
  buildings: BuildingsData;
  goalTimes: GoalTime[];
}

export function BuildingsChart({ buildings, goalTimes }: Props) {
  const patternBase = `bld-${useId().replace(/:/g, "")}`;
  const [asTable, setAsTable] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const endDay = Math.max(0, ...goalTimes.map((g) => g.sim_time_s / SECONDS_PER_DAY));
  const { series, rows } = useMemo(() => buildChartModel(buildings, endDay), [buildings, endDay]);

  if (rows.length === 0) {
    return <EmptyState title="No buildings placed" hint="This session didn't place any buildings." />;
  }

  const visible = series.filter((s) => !hidden.has(s.key));
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const columns: Column<ChartRow>[] = [
    { key: "day", header: "Sim day", numeric: true, render: (row) => formatDayTick(row.day) },
    ...series.map((s) => ({
      key: s.key,
      header: s.name,
      numeric: true,
      render: (row: ChartRow) => row.counts[s.key],
    })),
  ];

  return (
    <div className="buildings-chart">
      <div className="buildings-chart__controls">
        {series.length > 1 && (
          <ul className="buildings-chart__legend" aria-label="Building types">
            {series.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  className="buildings-chart__legend-item"
                  aria-pressed={!hidden.has(s.key)}
                  onClick={() => toggle(s.key)}
                >
                  <Swatch slot={s.slot} />
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="buildings-chart__toggle"
          onClick={() => setAsTable((v) => !v)}
        >
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>
      {asTable ? (
        <DataTable
          caption="Cumulative buildings by type over sim days"
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.day)}
        />
      ) : (
        <div role="img" aria-label={summarizeBuildings(buildings)} className="buildings-chart__plot">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={rows} margin={{ top: 8 + LABEL_LANES * 14, right: 16, bottom: 20, left: 0 }}>
              <defs>
                {series.map((s) => (
                  <pattern
                    key={s.key}
                    id={`${patternBase}-${s.slot}`}
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="6" height="6" fill={seriesColor(s.slot)} />
                    <TextureOverlay texture={textureFor(s.slot)} />
                  </pattern>
                ))}
              </defs>
              <CartesianGrid {...chartTheme.grid} />
              <XAxis
                dataKey="day"
                type="number"
                domain={[0, "dataMax"]}
                tickFormatter={formatDayTick}
                label={{ value: "Sim days", position: "insideBottom", offset: -12, fill: "var(--text-muted)", fontSize: 12 }}
                {...chartTheme.axis}
              />
              <YAxis width={32} axisLine={false} allowDecimals={false} {...chartTheme.axis} />
              <Tooltip
                {...chartTheme.tooltip}
                isAnimationActive={false}
                content={<BuildingsTooltip series={visible} />}
              />
              {visible.map((s) => (
                <Area
                  key={s.key}
                  dataKey={(row: ChartRow) => row.counts[s.key]}
                  name={s.name}
                  type="stepAfter"
                  stackId="buildings"
                  isAnimationActive={false}
                  fill={`url(#${patternBase}-${s.slot})`}
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                />
              ))}
              {goalTimes.map((g, index) => (
                <ReferenceLine
                  key={g.goal}
                  x={g.sim_time_s / SECONDS_PER_DAY}
                  stroke="var(--text-muted)"
                  strokeDasharray="4 3"
                  label={<GoalLabel lane={index % LABEL_LANES} text={g.goal} />}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
