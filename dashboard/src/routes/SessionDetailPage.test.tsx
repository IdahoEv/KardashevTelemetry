import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { SessionDetail } from "../api";
import { stubSessionDetailApi } from "../test/mocks";
import { SessionDetailPage } from "./SessionDetailPage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function detail(overrides: Partial<SessionDetail> = {}): SessionDetail {
  return {
    session_id: "s1",
    install_id: "install",
    player_name: "Ada",
    build_version: "0.3.1",
    build_commit: null,
    wall_time_s: 3675,
    sim_time_s: 30_000_000,
    goals: ["G1", "G2"],
    last_goal: "G2",
    dev: true,
    event_count: 15,
    ended: true,
    goal_times: [
      { goal: "G2", sim_time_s: 259_200 },
      { goal: "G1", sim_time_s: 86_400 },
    ],
    buildings: { types: ["mine"], series: [{ sim_time_s: 3000, counts: { mine: 1 } }] },
    ...overrides,
  };
}

function failingClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(client: QueryClient = new QueryClient(), initialUrl = "/sessions/s1") {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("renders the header, goal table, timeline, and chart slot from the API", async () => {
  stubSessionDetailApi(detail());

  renderPage(new QueryClient(), "/sessions/s1?name=ev");

  expect(await screen.findByRole("heading", { name: "Ada" })).toBeTruthy();
  expect(screen.getByText("0.3.1")).toBeTruthy();
  expect(screen.getByText("1:01:15 wall")).toBeTruthy();
  expect(screen.getByText("347.2 days sim")).toBeTruthy();
  expect(screen.getByText("Dev")).toBeTruthy();
  expect(screen.getByText("Ended")).toBeTruthy();

  const bodyRows = [...document.querySelectorAll("tbody tr")] as HTMLElement[];
  expect(within(bodyRows[0]).getByText("G1")).toBeTruthy();
  expect(within(bodyRows[0]).getByText("1.0 days")).toBeTruthy();
  expect(within(bodyRows[1]).getByText("G2")).toBeTruthy();
  expect(within(bodyRows[1]).getByText("3.0 days")).toBeTruthy();

  const marks = [...document.querySelectorAll(".goal-timeline__mark")];
  expect(marks).toHaveLength(2);
  expect(Number.parseFloat((marks[0] as HTMLElement).style.left)).toBeCloseTo(33.33, 0);
  expect(Number.parseFloat((marks[1] as HTMLElement).style.left)).toBeCloseTo(100, 0);
  expect(marks[0].getAttribute("title")).toContain("G1");

  expect(screen.getByText("Buildings chart coming soon")).toBeTruthy();
  expect(document.querySelector("[data-slot='buildings-chart']")).toBeTruthy();
});

test("omits the dev badge and marks in-progress sessions", async () => {
  stubSessionDetailApi(detail({ dev: false, ended: false }));

  renderPage();

  expect(await screen.findByRole("heading", { name: "Ada" })).toBeTruthy();
  expect(screen.queryByText("Dev")).toBeNull();
  expect(screen.getByText("In progress")).toBeTruthy();
});

test("shows an empty state for a session with no goals", async () => {
  stubSessionDetailApi(detail({ goal_times: [] }));

  renderPage();

  expect(await screen.findByText("No goals reached")).toBeTruthy();
  expect(document.querySelectorAll(".goal-timeline__mark")).toHaveLength(0);
  expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
});

test("shows a not-found state on a 404", async () => {
  stubSessionDetailApi(null);

  renderPage();

  expect(await screen.findByText("Session not found")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getAllByRole("link", { name: /back to sessions/i })).toHaveLength(1);
});

test("shows an error state on a failed request", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  renderPage(failingClient());

  expect((await screen.findByRole("alert")).textContent).toContain("Couldn't load session");
  expect(screen.getAllByRole("link", { name: /back to sessions/i })).toHaveLength(1);
});

test("back link carries the list filters", async () => {
  stubSessionDetailApi(detail());

  renderPage(new QueryClient(), "/sessions/s1?name=ev&build=0.3.2");

  expect(
    await screen
      .findByRole("link", { name: /back to sessions/i })
      .then((link) => link.getAttribute("href")),
  ).toBe("/?name=ev&build=0.3.2");
});

test("shows a loading state while the request is pending", () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise(() => {})));

  renderPage();

  expect(screen.getByRole("status").textContent).toContain("Loading session");
});
