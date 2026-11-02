import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchSessionDetail, fetchStats, filtersToParams } from "./api";
import { statsFixture } from "./test/mocks";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("filtersToParams", () => {
  test("omits every default value", () => {
    const params = filtersToParams({ dev: "exclude", name: "", build: [], reached: [] });

    expect(params.toString()).toBe("");
  });

  test("encodes non-defaults with repeated keys and a trimmed name", () => {
    const params = filtersToParams({
      dev: "only",
      name: " ev ",
      build: ["0.3.1", ""],
      reached: ["G1"],
    });

    expect(params.toString()).toBe("dev=only&name=ev&build=0.3.1&reached=G1");
  });
});

describe("fetchStats", () => {
  test("serializes filters into the stats query string", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(statsFixture())));
    vi.stubGlobal("fetch", fetchMock);

    await fetchStats({ dev: "only", name: "ev", build: ["0.3.2"], reached: ["G1"] });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/stats?dev=only&name=ev&build=0.3.2&reached=G1",
    );
  });

  test("throws when the stats request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    await expect(
      fetchStats({ dev: "exclude", name: "", build: [], reached: [] }),
    ).rejects.toThrow("stats request failed: 500");
  });
});

describe("fetchSessionDetail", () => {
  test("requests the URL-encoded session id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("null"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchSessionDetail("abc def/123");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/sessions/abc%20def%2F123");
  });

  test("returns null on a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 404 })),
    );

    expect(await fetchSessionDetail("s1")).toBeNull();
  });

  test("throws on another non-OK status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    await expect(fetchSessionDetail("s1")).rejects.toThrow(
      "session detail request failed: 500",
    );
  });
});
