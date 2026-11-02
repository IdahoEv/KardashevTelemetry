import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { SessionsResponse } from "./api";
import { stubSessionsApi } from "./test/mocks";
import App from "./App";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function renderApp(client: QueryClient, path = "/") {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SESSIONS_FIXTURE: SessionsResponse = {
  total_unfiltered: 5,
  total: 3,
  sessions: [
    {
      session_id: "1",
      install_id: "install",
      player_name: "Ada",
      build_version: "0.3.1",
      build_commit: null,
      wall_time_s: 3675,
      sim_time_s: 30_000_000,
      goals: ["G1"],
      last_goal: "G1",
      dev: false,
      event_count: 15,
      ended: true,
    },
  ],
};

test("shows the sessions list on the index route", async () => {
  stubSessionsApi(SESSIONS_FIXTURE);

  renderApp(new QueryClient());

  expect(await screen.findByRole("heading", { name: "Sessions", level: 1 })).toBeTruthy();
  expect(await screen.findByText("3 of 5 sessions")).toBeTruthy();
  expect(screen.getByText("Ada")).toBeTruthy();
});

test("shows the health result from the API", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", session_count: 3 })),
    ),
  );

  renderApp(new QueryClient(), "/health");

  expect(await screen.findByText("ok")).toBeTruthy();
  expect(screen.getByText("3")).toBeTruthy();
});

test("shows an alert when the API responds with an error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  renderApp(new QueryClient({ defaultOptions: { queries: { retry: false } } }), "/health");

  expect((await screen.findByRole("alert")).textContent).toContain("API unreachable");
});

test("renders a placeholder on the session detail route", () => {
  renderApp(new QueryClient(), "/sessions/abc123");

  expect(screen.getByText("Session detail coming soon")).toBeTruthy();
});

test("serves the styleguide route in dev", () => {
  renderApp(new QueryClient(), "/styleguide");

  expect(screen.getByRole("heading", { name: /styleguide/i })).toBeTruthy();
});

test("omits the styleguide route outside dev", () => {
  vi.stubEnv("DEV", false);

  renderApp(new QueryClient(), "/styleguide");

  expect(screen.queryByRole("heading", { name: /styleguide/i })).toBeNull();
});

test("renders the shell title and primary nav", () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  renderApp(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  expect(screen.getByText("Kardashev Telemetry")).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Sessions" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Health" })).toBeTruthy();
});
