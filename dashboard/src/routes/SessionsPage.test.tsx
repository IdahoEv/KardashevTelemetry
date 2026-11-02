import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { SessionSummary, SessionsResponse } from "../api";
import { statsFixture, stubSessionsApi } from "../test/mocks";
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
  stubSessionsApi(response);
}

function failingClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderPage(client: QueryClient = new QueryClient(), initialUrl = "/") {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <SessionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function requestedUrls(fetchMock: ReturnType<typeof stubSessionsApi>): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input));
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
  expect(screen.getAllByText("abc1234").map((el) => el.getAttribute("title"))).toContain(
    "abc1234567",
  );
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

test("flips sort direction on a second header click, nulls last descending", async () => {
  stubSessionsResponse(FIXTURE);

  renderPage();

  const nameHeader = await screen.findByRole("button", { name: /name/i });
  fireEvent.click(nameHeader);
  expect(rowNames()).toEqual(["Unnamed", "Ada", "Grace"]);
  fireEvent.click(nameHeader);
  expect(rowNames()).toEqual(["Grace", "Ada", "Unnamed"]);
});

test("sorts the build column by version, then commit, then unknown", async () => {
  stubSessionsResponse({
    total_unfiltered: 4,
    total: 4,
    sessions: [
      summary({ session_id: "1", player_name: "Unknown", build_version: null, build_commit: null }),
      summary({ session_id: "2", player_name: "Commit", build_version: null, build_commit: "abc1234567" }),
      summary({ session_id: "3", player_name: "New", build_version: "0.3.2" }),
      summary({ session_id: "4", player_name: "Old", build_version: "0.3.1" }),
    ],
  });

  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: /build/i }));
  expect(rowNames()).toEqual(["Unknown", "Old", "New", "Commit"]);
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

  expect(screen.getByText("Loading sessions…")).toBeTruthy();
});

test("shows an error state when the API fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  renderPage(failingClient());

  expect(await screen.findByText("Couldn't load sessions")).toBeTruthy();
  expect(await screen.findByText("Couldn't load statistics")).toBeTruthy();
});

test("shows an empty state when there are no sessions", async () => {
  stubSessionsResponse({ total_unfiltered: 0, total: 0, sessions: [] });

  renderPage();

  expect(await screen.findByText("No sessions yet")).toBeTruthy();
});

test("keeps the count line when every session is filtered out", async () => {
  stubSessionsResponse({ total_unfiltered: 2, total: 0, sessions: [] });

  renderPage();

  expect(await screen.findByText("0 of 2 sessions")).toBeTruthy();
  expect(screen.getByText(/dev builds are excluded/i)).toBeTruthy();
  expect(screen.queryByText("No sessions yet")).toBeNull();
});

test("requests the API with filters read from the URL", async () => {
  const fetchMock = stubSessionsApi(FIXTURE);

  renderPage(new QueryClient(), "/?dev=only&build=0.3.1&build=0.3.2");

  await screen.findByText("3 of 5 sessions");
  expect(requestedUrls(fetchMock)).toContain("/api/sessions?dev=only&build=0.3.1&build=0.3.2");
});

test("reloads with the name filter and pre-fills the search input", async () => {
  const fetchMock = stubSessionsApi(FIXTURE);

  renderPage(new QueryClient(), "/?name=ev");

  await screen.findByText("3 of 5 sessions");
  expect(requestedUrls(fetchMock)).toContain("/api/sessions?name=ev");
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("ev");
});

test("updates the count line from a filtered response", async () => {
  stubSessionsApi(FIXTURE, { ...FIXTURE, total: 1, sessions: [FIXTURE.sessions[0]] });

  renderPage(new QueryClient(), "/?name=Ada");

  expect(await screen.findByText("1 of 5 sessions")).toBeTruthy();
});

test("refetches when a build checkbox is toggled", async () => {
  const fetchMock = stubSessionsApi(
    FIXTURE,
    { ...FIXTURE, total: 1, sessions: [FIXTURE.sessions[0]] },
  );

  renderPage();

  await screen.findByText("3 of 5 sessions");
  fireEvent.click(screen.getByLabelText("0.3.2"));

  expect(await screen.findByText("1 of 5 sessions")).toBeTruthy();
  expect(requestedUrls(fetchMock)).toContain("/api/sessions?build=0.3.2");
});

test("refetches when the dev mode changes", async () => {
  const fetchMock = stubSessionsApi(
    FIXTURE,
    { ...FIXTURE, total: 2, sessions: FIXTURE.sessions.slice(0, 2) },
  );

  renderPage();

  await screen.findByText("3 of 5 sessions");
  fireEvent.click(screen.getByLabelText("Only"));

  expect(await screen.findByText("2 of 5 sessions")).toBeTruthy();
  expect(requestedUrls(fetchMock)).toContain("/api/sessions?dev=only");
});

test("shares the options request with the table when the filters match it", async () => {
  const fetchMock = stubSessionsApi(FIXTURE);

  renderPage(new QueryClient(), "/?dev=include");

  await screen.findByText("3 of 5 sessions");
  const includeUrls = requestedUrls(fetchMock).filter(
    (url) => url.startsWith("/api/sessions") && url.includes("dev=include"),
  );
  expect(includeUrls).toHaveLength(1);
});

test("renders the statistics panel alongside the list", async () => {
  stubSessionsApi(FIXTURE);

  renderPage();

  expect(await screen.findByText("3 of 5 sessions")).toBeTruthy();
  expect(screen.getByText("Median wall time")).toBeTruthy();
  expect(screen.getByText("Median sim time")).toBeTruthy();
});

test("refetches the statistics when a build checkbox is toggled", async () => {
  const fetchMock = stubSessionsApi(
    FIXTURE,
    { ...FIXTURE, total: 1, sessions: [FIXTURE.sessions[0]] },
    statsFixture({ sessions: 1 }),
  );

  renderPage();

  await screen.findByText("3 of 5 sessions");
  expect(requestedUrls(fetchMock)).toContain("/api/stats");
  fireEvent.click(screen.getByLabelText("0.3.2"));

  expect(await screen.findByText("1 of 5 sessions")).toBeTruthy();
  expect(requestedUrls(fetchMock)).toContain("/api/stats?build=0.3.2");
});

test("renders build and goal options from the unfiltered data", async () => {
  stubSessionsApi(FIXTURE);

  renderPage();

  await screen.findByText("3 of 5 sessions");
  expect((screen.getByLabelText("0.3.1") as HTMLInputElement).checked).toBe(false);
  expect(screen.getByLabelText("0.3.2")).toBeTruthy();
  expect(screen.getByLabelText("abc1234")).toBeTruthy();
  expect(screen.getByLabelText("G1")).toBeTruthy();
  expect(screen.getByLabelText("G2")).toBeTruthy();
});

test("shows a filtered empty state and clears filters on demand", async () => {
  const fetchMock = stubSessionsApi(FIXTURE, { ...FIXTURE, total: 0, sessions: [] });

  renderPage(new QueryClient(), "/?name=zz");

  expect(await screen.findByText("No sessions match these filters")).toBeTruthy();
  expect(screen.getByText("0 of 5 sessions")).toBeTruthy();
  expect(screen.queryByText("No sessions to show")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

  expect(await screen.findByText("3 of 5 sessions")).toBeTruthy();
  expect(requestedUrls(fetchMock)).toContain("/api/sessions");
});
