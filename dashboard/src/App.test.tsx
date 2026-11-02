import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App";

afterEach(() => vi.unstubAllGlobals());

function renderApp(client: QueryClient) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("shows the health result from the API", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", session_count: 3 })),
    ),
  );

  renderApp(new QueryClient());

  expect(await screen.findByText("ok")).toBeTruthy();
  expect(screen.getByText("3")).toBeTruthy();
});

test("shows an alert when the API responds with an error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  renderApp(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  expect((await screen.findByRole("alert")).textContent).toContain("API unreachable");
});

test("renders the shell title and primary nav", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

  renderApp(new QueryClient({ defaultOptions: { queries: { retry: false } } }));

  expect(screen.getByText("Kardashev Telemetry")).toBeTruthy();
  expect(screen.getByRole("navigation", { name: "Primary" })).toBeTruthy();
});
