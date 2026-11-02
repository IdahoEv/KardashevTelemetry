import type { BuildingsData } from "../api";
import { formatSimTime } from "../format";
import { SERIES_COLORS } from "./chartTheme";

const SECONDS_PER_DAY = 86_400;
const OTHER = "Other";

export interface ChartSeries {
  key: string;
  name: string;
  slot: number;
}

export interface ChartRow {
  day: number;
  counts: Record<string, number>;
}

export interface ChartModel {
  series: ChartSeries[];
  rows: ChartRow[];
}

function seriesFor(types: string[]): ChartSeries[] {
  const slots = SERIES_COLORS.length;
  if (types.length <= slots) {
    return types.map((type, slot) => ({ key: type, name: type, slot }));
  }
  const named = types.slice(0, slots - 1).map((type, slot) => ({ key: type, name: type, slot }));
  return [...named, { key: OTHER, name: OTHER, slot: slots - 1 }];
}

export function buildChartModel(buildings: BuildingsData, endDay = 0): ChartModel {
  if (buildings.series.length === 0) return { series: [], rows: [] };

  const series = seriesFor(buildings.types);
  const named = new Set(series.map((s) => s.key));
  const hasOther = named.has(OTHER);

  const rowFor = (day: number, source: Record<string, number>): ChartRow => {
    const counts = Object.fromEntries(series.map((s) => [s.key, 0]));
    for (const [type, n] of Object.entries(source)) {
      const key = named.has(type) ? type : hasOther ? OTHER : null;
      if (key !== null) counts[key] += n;
    }
    return { day, counts };
  };

  const rows = buildings.series.map((p) => rowFor(p.sim_time_s / SECONDS_PER_DAY, p.counts));
  const last = rows[rows.length - 1];
  if (endDay > last.day) rows.push({ day: endDay, counts: { ...last.counts } });
  if (rows[0].day > 0) rows.unshift(rowFor(0, {}));
  return { series, rows };
}

export function summarizeBuildings(buildings: BuildingsData): string {
  const last = buildings.series.at(-1);
  if (last === undefined) return "No buildings placed.";

  const entries = Object.entries(last.counts);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const [topType, topCount] = entries.reduce((best, e) => (e[1] > best[1] ? e : best));
  const noun = total === 1 ? "building" : "buildings";
  const typeNoun = entries.length === 1 ? "type" : "types";
  return `${total} ${noun} of ${entries.length} ${typeNoun} over ${formatSimTime(last.sim_time_s)}. Most numerous: ${topType} (${topCount}).`;
}
