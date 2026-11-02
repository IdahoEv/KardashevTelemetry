import { describe, expect, test } from "vitest";
import type { SessionSummary } from "../api";
import {
  compareBuilds,
  compareNullableText,
  compareSessionBuilds,
  compareSimTime,
  compareVersions,
  sortSessionsDefault,
} from "./sorting";

describe("compareVersions", () => {
  test("compares segments numerically, not lexically", () => {
    expect(compareVersions("0.3.10", "0.3.9")).toBeGreaterThan(0);
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("0.3.9", "0.3.10")).toBeLessThan(0);
  });

  test("treats missing segments as zero", () => {
    expect(compareVersions("0.3", "0.3.0")).toBe(0);
    expect(compareVersions("0.3.1", "0.3")).toBeGreaterThan(0);
  });

  test("falls back to string compare for non-numeric segments", () => {
    expect(compareVersions("0.3.1-rc1", "0.3.1")).not.toBe(0);
    expect(compareVersions("0.3.beta", "0.3.1")).not.toBe(0);
  });
});

describe("compareBuilds", () => {
  test("treats null and empty as older than any version", () => {
    expect(compareBuilds(null, "0.3.1")).toBeLessThan(0);
    expect(compareBuilds("", "0.3.1")).toBeLessThan(0);
    expect(compareBuilds("0.3.1", null)).toBeGreaterThan(0);
    expect(compareBuilds(null, null)).toBe(0);
  });

  test("compares versions numerically", () => {
    expect(compareBuilds("0.3.10", "0.3.9")).toBeGreaterThan(0);
  });
});

describe("compareSessionBuilds", () => {
  test("an empty build version falls back to the commit", () => {
    const commitOnly = summary({ build_version: "", build_commit: "abc1234567" });
    const noBuild = summary({ build_version: null, build_commit: null });

    expect(compareSessionBuilds(commitOnly, noBuild)).toBeGreaterThan(0);
    expect(compareSessionBuilds(noBuild, commitOnly)).toBeLessThan(0);
  });

  test("prefers the version when both are present", () => {
    const a = summary({ build_version: "0.3.1", build_commit: "abc1234567" });
    const b = summary({ build_version: "0.3.2", build_commit: null });

    expect(compareSessionBuilds(a, b)).toBeLessThan(0);
  });
});

describe("compareNullableText", () => {
  test("treats null as smallest", () => {
    expect(compareNullableText(null, "ada")).toBeLessThan(0);
    expect(compareNullableText("ada", null)).toBeGreaterThan(0);
    expect(compareNullableText(null, null)).toBe(0);
  });

  test("orders strings by locale", () => {
    expect(compareNullableText("ada", "grace")).toBeLessThan(0);
  });
});

describe("compareSimTime", () => {
  test("treats null as smallest", () => {
    expect(compareSimTime(null, 1)).toBeLessThan(0);
    expect(compareSimTime(1, null)).toBeGreaterThan(0);
    expect(compareSimTime(null, null)).toBe(0);
    expect(compareSimTime(2, 1)).toBeGreaterThan(0);
  });
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

describe("sortSessionsDefault", () => {
  test("orders by build desc, then wall time desc, then session id", () => {
    const sessions = [
      summary({ session_id: "b", build_version: "0.3.1", wall_time_s: 50 }),
      summary({ session_id: "a", build_version: "0.3.2", wall_time_s: 100 }),
      summary({ session_id: "c", build_version: "0.3.1", wall_time_s: 100 }),
      summary({ session_id: "d", build_version: "0.3.10", wall_time_s: 1 }),
      summary({ session_id: "e", build_version: null, wall_time_s: 999 }),
    ];

    expect(sortSessionsDefault(sessions).map((s) => s.session_id)).toEqual([
      "d",
      "a",
      "c",
      "b",
      "e",
    ]);
  });

  test("does not mutate the input", () => {
    const sessions = [
      summary({ session_id: "b", wall_time_s: 50 }),
      summary({ session_id: "a", wall_time_s: 100 }),
    ];

    sortSessionsDefault(sessions);

    expect(sessions.map((s) => s.session_id)).toEqual(["b", "a"]);
  });
});
