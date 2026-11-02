import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { SessionFilterParams } from "../api";
import { SessionFilterBar } from "./SessionFilterBar";
import type { BuildOption } from "./useSessionFilterOptions";

afterEach(() => {
  vi.useRealTimers();
});

const BUILD_OPTIONS: BuildOption[] = [
  { value: "0.3.1", label: "0.3.1" },
  { value: "abc1234567", label: "abc1234", title: "abc1234567" },
];

const DEFAULT_FILTERS: SessionFilterParams = {
  dev: "exclude",
  name: "",
  build: [],
  reached: [],
};

function baseProps(overrides: Partial<Parameters<typeof SessionFilterBar>[0]> = {}) {
  return {
    filters: DEFAULT_FILTERS,
    hasActiveFilters: false,
    onDevChange: vi.fn(),
    onNameCommit: vi.fn(),
    onBuildToggle: vi.fn(),
    onGoalToggle: vi.fn(),
    onClear: vi.fn(),
    buildOptions: BUILD_OPTIONS,
    goalOptions: ["G1", "G2"],
    ...overrides,
  };
}

test("renders dev, name, build, and goal controls from options", () => {
  render(<SessionFilterBar {...baseProps()} />);

  expect(screen.getByLabelText("Exclude")).toBeTruthy();
  expect(screen.getByLabelText("Include")).toBeTruthy();
  expect(screen.getByLabelText("Only")).toBeTruthy();
  expect(screen.getByLabelText("0.3.1")).toBeTruthy();
  expect(screen.getByText("abc1234").getAttribute("title")).toBe("abc1234567");
  expect(screen.getByLabelText("G1")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /clear filters/i })).toBeNull();
});

test("calls handlers for dev, build, and goal changes", () => {
  const props = baseProps();
  render(<SessionFilterBar {...props} />);

  fireEvent.click(screen.getByLabelText("Only"));
  expect(props.onDevChange).toHaveBeenCalledWith("only");

  fireEvent.click(screen.getByLabelText("0.3.1"));
  expect(props.onBuildToggle).toHaveBeenCalledWith("0.3.1");

  fireEvent.click(screen.getByLabelText("G2"));
  expect(props.onGoalToggle).toHaveBeenCalledWith("G2");
});

test("debounces name commits by 300ms and trims", () => {
  vi.useFakeTimers();
  const props = baseProps();
  render(<SessionFilterBar {...props} />);

  fireEvent.change(screen.getByLabelText("Name"), { target: { value: " ev " } });

  vi.advanceTimersByTime(299);
  expect(props.onNameCommit).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(props.onNameCommit).toHaveBeenCalledWith("ev");
});

test("commits only the final value while typing", () => {
  vi.useFakeTimers();
  const props = baseProps();
  render(<SessionFilterBar {...props} />);

  const input = screen.getByLabelText("Name");
  fireEvent.change(input, { target: { value: "e" } });
  fireEvent.change(input, { target: { value: "ev" } });

  vi.advanceTimersByTime(300);

  expect(props.onNameCommit).toHaveBeenCalledTimes(1);
  expect(props.onNameCommit).toHaveBeenCalledWith("ev");
});

test("pre-fills the name input from the filters", () => {
  render(<SessionFilterBar {...baseProps({ filters: { ...DEFAULT_FILTERS, name: "ev" } })} />);

  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("ev");
});

test("resyncs the name input when the filter name changes externally", () => {
  vi.useFakeTimers();
  const props = baseProps({ filters: { ...DEFAULT_FILTERS, name: "ev" } });
  const { rerender } = render(<SessionFilterBar {...props} />);

  rerender(<SessionFilterBar {...props} filters={{ ...DEFAULT_FILTERS, name: "" }} />);
  vi.advanceTimersByTime(300);

  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
  expect(props.onNameCommit).toHaveBeenLastCalledWith("");
});

test("clear resets the name input and calls onClear", () => {
  const props = baseProps({
    filters: { dev: "only", name: "ev", build: ["0.3.1"], reached: ["G1"] },
    hasActiveFilters: true,
  });
  render(<SessionFilterBar {...props} />);

  fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

  expect(props.onClear).toHaveBeenCalledTimes(1);
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
});
