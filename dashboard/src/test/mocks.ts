import { vi, type Mock } from "vitest";
import type { SessionDetail, SessionsResponse, StatsResponse } from "../api";

export function statsFixture(overrides: Partial<StatsResponse> = {}): StatsResponse {
  return {
    sessions: 5,
    wall_time_s: { n: 5, median: 500, mean: 500 },
    sim_time_s: { n: 4, median: 86_400, mean: 90_000 },
    stalls_per_session: { n: 5, mean: 0.5 },
    events_per_session: { n: 5, median: 15 },
    goals: {
      G1: {
        reached: 2,
        reach_rate: 0.4,
        time_to_goal: { n: 2, median: 5400, mean: 5400, min: 3600, max: 7200 },
      },
    },
    ...overrides,
  };
}

function derivedStats(filtered: SessionsResponse): StatsResponse {
  return statsFixture({
    sessions: filtered.total,
    wall_time_s: { n: 0, median: null, mean: null },
    sim_time_s: { n: 0, median: null, mean: null },
    stalls_per_session: { n: 0, mean: null },
    events_per_session: { n: 0, median: null },
    goals: {},
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

export function stubSessionsApi(
  all: SessionsResponse,
  filtered: SessionsResponse = all,
  stats: StatsResponse = derivedStats(filtered),
): Mock {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith("/api/stats")) return Promise.resolve(jsonResponse(stats));
    if (url === "/api/sessions" || url.includes("dev=include")) {
      return Promise.resolve(jsonResponse(all));
    }
    if (url.startsWith("/api/sessions")) return Promise.resolve(jsonResponse(filtered));
    // Unknown URLs 404 so a routing mistake fails loudly instead of serving stale fixtures.
    return Promise.resolve(new Response("not found", { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function stubSessionDetailApi(detail: SessionDetail | null): Mock {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    if (/^\/api\/sessions\/[^?]+/.test(url)) {
      return Promise.resolve(
        detail
          ? jsonResponse(detail)
          : jsonResponse({ detail: "unknown session_id" }, 404),
      );
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
