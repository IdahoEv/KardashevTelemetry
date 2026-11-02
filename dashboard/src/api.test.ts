import { describe, expect, test } from "vitest";
import { filtersToParams } from "./api";

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
