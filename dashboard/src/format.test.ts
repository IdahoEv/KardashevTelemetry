import { describe, expect, test } from "vitest";
import { formatBuild, formatSimTime, formatWallTime } from "./format";

describe("formatWallTime", () => {
  test("formats zero", () => {
    expect(formatWallTime(0)).toBe("0:00:00");
  });

  test("pads minutes and seconds", () => {
    expect(formatWallTime(61)).toBe("0:01:01");
  });

  test("keeps hours unpadded past a day", () => {
    expect(formatWallTime(90_061)).toBe("25:01:01");
  });

  test("floors fractional seconds", () => {
    expect(formatWallTime(61.9)).toBe("0:01:01");
  });
});

describe("formatSimTime", () => {
  test("renders an em dash for null", () => {
    expect(formatSimTime(null)).toBe("—");
  });

  test("formats a single day", () => {
    expect(formatSimTime(86_400)).toBe("1.0 days");
  });

  test("formats tens of millions of seconds", () => {
    expect(formatSimTime(30_000_000)).toBe("347.2 days");
  });
});

describe("formatBuild", () => {
  test("prefers the version", () => {
    expect(formatBuild("0.3.1", "abc1234567")).toEqual({ label: "0.3.1" });
  });

  test("shortens a commit to 7 chars with the full commit as title", () => {
    expect(formatBuild(null, "abc1234567")).toEqual({ label: "abc1234", title: "abc1234567" });
    expect(formatBuild("", "abc1234567")).toEqual({ label: "abc1234", title: "abc1234567" });
  });

  test("renders an em dash when neither is present", () => {
    expect(formatBuild(null, null)).toEqual({ label: "—" });
  });
});
