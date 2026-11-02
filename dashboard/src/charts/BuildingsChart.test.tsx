import { fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { expect, test, vi } from "vitest";
import type { BuildingsData, GoalTime } from "../api";
import { BuildingsChart, BuildingsTooltip, GoalLabel } from "./BuildingsChart";

// happy-dom gives ResponsiveContainer a zero-size parent, so the chart never
// renders; inject explicit dimensions to exercise the real Recharts children.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 800, height: 400 }),
  };
});

const DAY = 86_400;

const buildings: BuildingsData = {
  types: ["mine", "smelter"],
  series: [
    { sim_time_s: DAY, counts: { mine: 1 } },
    { sim_time_s: 2 * DAY, counts: { mine: 1, smelter: 1 } },
  ],
};

test("shows an empty state when no buildings were placed", () => {
  render(<BuildingsChart buildings={{ types: [], series: [] }} goalTimes={[]} />);
  expect(screen.getByText("No buildings placed")).toBeTruthy();
});

test("exposes a text summary on the chart", () => {
  render(<BuildingsChart buildings={buildings} goalTimes={[]} />);
  expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
    "2 buildings of 2 types over 2.0 days. Most numerous: mine (1).",
  );
});

test("legend toggles types on and off", () => {
  render(<BuildingsChart buildings={buildings} goalTimes={[]} />);
  const mine = screen.getByRole("button", { name: "mine" });
  expect(mine.getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(mine);
  expect(mine.getAttribute("aria-pressed")).toBe("false");
});

test("a single type renders without a legend", () => {
  render(
    <BuildingsChart
      buildings={{ types: ["mine"], series: [{ sim_time_s: DAY, counts: { mine: 1 } }] }}
      goalTimes={[]}
    />,
  );
  expect(screen.queryByRole("list", { name: "Building types" })).toBeNull();
  expect(screen.getByRole("img")).toBeTruthy();
});

test("table view lists counts per type by sim day", () => {
  render(<BuildingsChart buildings={buildings} goalTimes={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Show table" }));
  expect(screen.getByRole("columnheader", { name: "smelter" })).toBeTruthy();
  expect(screen.getAllByRole("row")).toHaveLength(4);
});

test("legend toggles hide the type's column in table view too", () => {
  render(<BuildingsChart buildings={buildings} goalTimes={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "mine" }));
  fireEvent.click(screen.getByRole("button", { name: "Show table" }));
  expect(screen.queryByRole("columnheader", { name: "mine" })).toBeNull();
  expect(screen.getByRole("columnheader", { name: "smelter" })).toBeTruthy();
});

test("goal times render labelled markers", () => {
  const goalTimes: GoalTime[] = [
    { goal: "Automate mining", sim_time_s: 2 * DAY },
    { goal: "First launch", sim_time_s: DAY },
  ];
  render(<BuildingsChart buildings={buildings} goalTimes={goalTimes} />);
  expect(screen.getByText("Automate mining")).toBeTruthy();
  expect(screen.getByText("First launch")).toBeTruthy();
});

test("tooltip lists per-type counts with a total", () => {
  render(
    <BuildingsTooltip
      active
      payload={[{ payload: { day: 2, counts: { mine: 1, smelter: 1 } } }]}
      series={[
        { key: "mine", name: "mine", slot: 0 },
        { key: "smelter", name: "smelter", slot: 1 },
      ]}
    />,
  );
  expect(screen.getByText("2.0 days")).toBeTruthy();
  expect(screen.getByText("mine")).toBeTruthy();
  expect(screen.getByText("smelter")).toBeTruthy();
  expect(screen.getByText("Total")).toBeTruthy();
  expect(screen.getByText("2")).toBeTruthy();
});

test("goal labels offset from the marker's x position", () => {
  render(<GoalLabel viewBox={{ x: 100 }} lane={1} text="Automate mining" />);
  const label = screen.getByText("Automate mining");
  expect(label.getAttribute("x")).toBe("104");
  expect(label.getAttribute("y")).toBe("24");
});
