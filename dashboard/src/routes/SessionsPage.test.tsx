import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { SessionSummary, SessionsResponse } from "../api";
import { SessionsPage } from "./SessionsPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function summary(overrides: Partial<SessionSummary>): SessionSummary {
  return {
    session_id: "id",
    install_id: "install",
    player_name: "Pilot",
    build_version: "0.3.1",
    build_commit: null,
    wall_time_s: 100,
    sim_time_s: 100,
    goals: [],
    last_goal: null,
    dev: false,
    event_count: 1,
    ended: true,
    ...overrides,
  };
}

const FIXTURE: SessionsResponse = {
  total_unfiltered: 5,
  total: 3,
  sessions: [
    summary({
      session_id: "1",
      player_name: "Ada",
      build_version: "0.3.1",
      wall_time_s: 3675,
      sim_time_s: 30_000_000,
      goals: ["G1", "G2"],
      last_goal: "G2",
      event_count: 15,
    }),
    summary({
      session_id: "2",
      player_name: "Grace",
      build_version: "0.3.2",
      wall_time_s: 61.9,
      sim_time_s: null,
    }),
    summary({
      session_id: "3",
      player_name: null,
      build_version: null,
      build_commit: "abc1234567",
      wall_time_s: 500,
      sim_time_s: 86_400,
      goals: ["G1"],
      last_goal: "G1",
      dev: true,
    }),
  ],
};

function stubSessionsResponse(response: SessionsResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(response))),
  );
}

function failingClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(client: QueryClient = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function rowNames(): string[] {
  return [...document.querySelectorAll("tbody tr")].map((row) => {
    const link = row.querySelector("a");
    return link?.textContent ?? "";
  });
}

test("shows the count line and formatted rows from the API", async () => {
  stubSessionsResponse(FIXTURE);

  renderPage();

  expect(await screen.findByText("3 of 5 sessions")).toBeTruthy();
  expect(screen.getByText("1:01:15")).toBeTruthy();
  expect(screen.getByText("0:01:01")).toBeTruthy();
  expect(screen.getByText("347.2 days")).toBeTruthy();
  expect(screen.getByText("1.0 days")).toBeTruthy();
  expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText("abc1234").getAttribute("title")).toBe("abc1234567");
});

test("orders rows by build desc then wall time desc by default", async () => {
  stubSessionsResponse(FIXTURE);

  renderPage();

  await screen.findByText("3 of 5 sessions");
  expect(rowNames()).toEqual(["Grace", "Ada", "Unnamed"]);
});

test("links each row to its session detail page", async () => {
  stubSessionsResponse(FIXTURE);

  renderPage();

  await screen.findByText("3 of 5 sessions");
  expect(screen.getByText("Ada").closest("a")?.getAttribute("href")).toBe("/sessions/1");
  expect(screen.getByText("Unnamed").closest("a")?.getAttribute("href")).toBe("/sessions/3");
});

test("sorts by name ascending on header click, nulls first", async () => {
  stubSessionsResponse(FIXTURE);

  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: /name/i }));
  expect(rowNames()).toEqual(["Unnamed", "Ada", "Grace"]);
});

test("sorts numeric columns descending first on header click", async () => {
  stubSessionsResponse(FIXTURE);

  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: /wall time/i }));
  const wallTimes = [...document.querySelectorAll("tbody tr")].map(
    (row) => within(row as HTMLElement).getByText(/^\d+:\d\d:\d\d$/).textContent,
  );
  expect(wallTimes).toEqual(["1:01:15", "0:08:20", "0:01:01"]);
});

test("shows a loading state while the request is pending", () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));

  renderPage();

  expect(screen.getByRole("status").textContent).toContain("Loading sessions");
});

test("shows an error state when the API fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  renderPage(failingClient());

  expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load sessions");
});

test("shows an empty state when there are no sessions", async () => {
  stubSessionsResponse({ total_unfiltered: 0, total: 0, sessions: [] });

  renderPage();

  expect(await screen.findByText("No sessions yet")).toBeTruthy();
});
