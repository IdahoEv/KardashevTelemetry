import { vi } from "vitest";
import type { SessionsResponse } from "../api";

export function stubSessionsApi(all: SessionsResponse, filtered: SessionsResponse = all) {
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input);
    const isUnfiltered = url === "/api/sessions" || url.includes("dev=include");
    const response = isUnfiltered ? all : filtered;
    return Promise.resolve(new Response(JSON.stringify(response)));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
