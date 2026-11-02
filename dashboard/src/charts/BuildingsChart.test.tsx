import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { BuildingsData } from "../api";
import { BuildingsChart } from "./BuildingsChart";

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
