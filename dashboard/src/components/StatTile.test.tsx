import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { StatTile } from "./StatTile";

test("renders label and value", () => {
  render(<StatTile label="Sessions" value="128" />);

  expect(screen.getByText("Sessions")).toBeTruthy();
  expect(screen.getByText("128")).toBeTruthy();
});

test("renders a delta with its direction spelled out for assistive tech", () => {
  render(<StatTile label="Crashes" value="4" delta="12%" trend="down" tone="good" />);

  expect(screen.getByText("12%")).toBeTruthy();
  expect(screen.getByText("Down")).toBeTruthy();
});

test("omits the delta when none is given", () => {
  render(<StatTile label="Sessions" value="128" />);

  expect(screen.queryByText("Down")).toBeNull();
  expect(screen.queryByText("Up")).toBeNull();
});
