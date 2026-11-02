import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DEFAULT_SESSION_FILTERS, type StatsResponse } from "../api";
import { statsFixture } from "../test/mocks";
import { StatsPanel } from "./StatsPanel";

afterEach(() => {
  vi.unstubAllGlobals();
});

function failingClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPanel(
  stats: StatsResponse,
  client: QueryClient = new QueryClient(),
) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(stats))),
  );
  render(
    <QueryClientProvider client={client}>
      <StatsPanel filters={DEFAULT_SESSION_FILTERS} />
    </QueryClientProvider>,
  );
}

function goalRow(goal: string): HTMLElement {
  const row = screen.getByText(goal).closest("tr");
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${goal}`);
  return row;
}

test("renders tiles and the goal table from the API", async () => {
  renderPanel(
    statsFixture({
      sessions: 7,
      wall_time_s: { n: 7, median: 3675, mean: 3675 },
      sim_time_s: { n: 6, median: 30_000_000, mean: 30_000_000 },
      goals: {
        G1: {
          reached: 5,
          reach_rate: 5 / 7,
          time_to_goal: { n: 5, median: 5400, mean: 5400, min: 3600, max: 7200 },
        },
      },
    }),
  );

  expect(await screen.findByText("Median wall time")).toBeTruthy();
  expect(screen.getByText("7")).toBeTruthy();
  expect(screen.getByText("1:01:15")).toBeTruthy();
  expect(screen.getByText("347.2 days")).toBeTruthy();
  const row = goalRow("G1");
  expect(within(row).getAllByText("5")).toHaveLength(2);
  expect(within(row).getByText("71%")).toBeTruthy();
  expect(within(row).getByText("0.1 days")).toBeTruthy();
});

test("renders an em dash, never zeros or NaN, for null medians", async () => {
  renderPanel(
    statsFixture({
      sessions: 3,
      wall_time_s: { n: 0, median: null, mean: null },
      sim_time_s: { n: 0, median: null, mean: null },
      goals: {
        G1: {
          reached: 1,
          reach_rate: 1 / 3,
          time_to_goal: { n: 0, median: null, mean: null, min: null, max: null },
        },
      },
    }),
  );

  expect(await screen.findByText("3")).toBeTruthy();
  expect(screen.getAllByText("—").length).toBe(3);
  expect(screen.queryByText(/NaN/)).toBeNull();
});

test("marks goal rows with a small n", async () => {
  renderPanel(
    statsFixture({
      goals: {
        G1: {
          reached: 2,
          reach_rate: 0.4,
          time_to_goal: { n: 4, median: 5400, mean: 5400, min: 3600, max: 7200 },
        },
        G2: {
          reached: 9,
          reach_rate: 0.9,
          time_to_goal: { n: 12, median: 10_800, mean: 10_800, min: 7200, max: 14_400 },
        },
      },
    }),
  );

  await screen.findByText("G1");
  expect(within(goalRow("G1")).getByText("low n")).toBeTruthy();
  expect(within(goalRow("G2")).queryByText("low n")).toBeNull();
});

test("notes tiles whose median rests on a small n", async () => {
  renderPanel(
    statsFixture({
      wall_time_s: { n: 3, median: 500, mean: 500 },
      sim_time_s: { n: 9, median: 86_400, mean: 90_000 },
    }),
  );

  expect(await screen.findByText("n = 3")).toBeTruthy();
  expect(screen.queryByText("n = 9")).toBeNull();
});

test("shows an empty state instead of zeros when no sessions match", async () => {
  renderPanel(
    statsFixture({
      sessions: 0,
      wall_time_s: { n: 0, median: null, mean: null },
      sim_time_s: { n: 0, median: null, mean: null },
      goals: {},
    }),
  );

  expect(await screen.findByText("No sessions to summarize")).toBeTruthy();
  expect(document.querySelectorAll(".stat-tile")).toHaveLength(0);
});

test("shows an error state when the API fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  render(
    <QueryClientProvider client={failingClient()}>
      <StatsPanel filters={DEFAULT_SESSION_FILTERS} />
    </QueryClientProvider>,
  );

  expect((await screen.findByRole("alert")).textContent).toContain(
    "Couldn't load statistics",
  );
});

test("shows a loading state while the request is pending", () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));

  render(
    <QueryClientProvider client={new QueryClient()}>
      <StatsPanel filters={DEFAULT_SESSION_FILTERS} />
    </QueryClientProvider>,
  );

  expect(screen.getByRole("status").textContent).toContain("Loading statistics");
});
