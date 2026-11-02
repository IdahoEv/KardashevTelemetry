import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchStats, filtersToParams } from "./api";
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
