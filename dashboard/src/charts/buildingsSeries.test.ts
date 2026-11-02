import { expect, test } from "vitest";
import type { BuildingsData } from "../api";
import { buildChartModel, summarizeBuildings } from "./buildingsSeries";

const DAY = 86_400;

const twoTypes: BuildingsData = {
  types: ["mine", "smelter"],
  series: [
    { sim_time_s: DAY, counts: { mine: 1 } },
    { sim_time_s: 2 * DAY, counts: { mine: 1, smelter: 1 } },
    { sim_time_s: 3 * DAY, counts: { mine: 2, smelter: 1 } },
  ],
};

test("empty data yields no series and no rows", () => {
  const model = buildChartModel({ types: [], series: [] });
  expect(model.series).toEqual([]);
  expect(model.rows).toEqual([]);
});

test("series are named in type order with stable palette slots", () => {
  const { series } = buildChartModel(twoTypes);
  expect(series).toEqual([
    { key: "mine", name: "mine", slot: 0 },
    { key: "smelter", name: "smelter", slot: 1 },
  ]);
});

test("rows convert sim seconds to days and zero-fill types not yet placed", () => {
  const { rows } = buildChartModel(twoTypes);
  expect(rows[1]).toEqual({ day: 1, counts: { mine: 1, smelter: 0 } });
  expect(rows[3]).toEqual({ day: 3, counts: { mine: 2, smelter: 1 } });
});

test("a zero row at day 0 is prepended so areas start at the axis", () => {
  const { rows } = buildChartModel(twoTypes);
  expect(rows[0]).toEqual({ day: 0, counts: { mine: 0, smelter: 0 } });
  expect(rows).toHaveLength(4);
});

test("no extra zero row when the first placement is at time zero", () => {
  const { rows } = buildChartModel({
    types: ["mine"],
    series: [{ sim_time_s: 0, counts: { mine: 1 } }],
  });
  expect(rows).toEqual([{ day: 0, counts: { mine: 1 } }]);
});

test("rows are extended to endDay holding the final counts", () => {
  const { rows } = buildChartModel(twoTypes, 5);
  expect(rows.at(-1)).toEqual({ day: 5, counts: { mine: 2, smelter: 1 } });
  expect(buildChartModel(twoTypes, 2).rows).toHaveLength(4);
});

test("a single type works", () => {
  const { series, rows } = buildChartModel({
    types: ["mine"],
    series: [{ sim_time_s: DAY, counts: { mine: 1 } }],
  });
  expect(series).toHaveLength(1);
  expect(rows.at(-1)).toEqual({ day: 1, counts: { mine: 1 } });
});

test("types beyond the eight palette slots fold into Other", () => {
  const types = Array.from({ length: 10 }, (_, i) => `t${i}`);
  const counts = Object.fromEntries(types.map((t) => [t, 1]));
  const { series, rows } = buildChartModel({
    types,
    series: [{ sim_time_s: DAY, counts }],
  });
  expect(series.map((s) => s.name)).toEqual([
    "t0", "t1", "t2", "t3", "t4", "t5", "t6", "Other",
  ]);
  expect(series.at(-1)?.slot).toBe(7);
  expect(rows.at(-1)?.counts.Other).toBe(3);
});

test("summary states totals, type count, duration and the top type", () => {
  expect(summarizeBuildings(twoTypes)).toBe(
    "3 buildings of 2 types over 3.0 days. Most numerous: mine (2).",
  );
});

test("summary handles a single building and no buildings", () => {
  expect(
    summarizeBuildings({ types: ["mine"], series: [{ sim_time_s: DAY, counts: { mine: 1 } }] }),
  ).toBe("1 building of 1 type over 1.0 days. Most numerous: mine (1).");
  expect(summarizeBuildings({ types: [], series: [] })).toBe("No buildings placed.");
});
