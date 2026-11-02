import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useSearchParams } from "react-router";
import { describe, expect, test } from "vitest";
import { useSessionFilters } from "./useSessionFilters";

type Filters = ReturnType<typeof useSessionFilters>;

function renderFilters(initialUrl: string): { filters: () => Filters; search: () => string } {
  const state: { hook?: Filters; search: string } = { search: "" };

  function HookCapture() {
    state.hook = useSessionFilters();
    return null;
  }

  function SearchCapture({ children }: { children?: ReactNode }) {
    const [searchParams] = useSearchParams();
    state.search = searchParams.toString();
    return <>{children}</>;
  }

  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SearchCapture />
      <HookCapture />
    </MemoryRouter>,
  );

  return { filters: () => state.hook!, search: () => state.search };
}

describe("useSessionFilters", () => {
  test("parses filters from the URL including repeated keys", () => {
    const { filters } = renderFilters(
      "/?dev=only&name=ev&build=0.3.1&build=abc1234&reached=g1&reached=g2",
    );

    expect(filters().filters).toEqual({
      dev: "only",
      name: "ev",
      build: ["0.3.1", "abc1234"],
      reached: ["g1", "g2"],
    });
    expect(filters().hasActiveFilters).toBe(true);
  });

  test("returns defaults when the URL has no filters", () => {
    const { filters, search } = renderFilters("/");

    expect(filters().filters).toEqual({ dev: "exclude", name: "", build: [], reached: [] });
    expect(filters().hasActiveFilters).toBe(false);
    expect(search()).toBe("");
  });

  test("writes filters to the URL with repeated keys", () => {
    const { filters, search } = renderFilters("/");

    act(() => filters().setDev("only"));
    act(() => filters().toggleBuild("0.3.1"));
    act(() => filters().toggleBuild("0.3.2"));
    act(() => filters().toggleReached("g1"));

    expect(search()).toBe("dev=only&build=0.3.1&build=0.3.2&reached=g1");
  });

  test("omits default values from the URL", () => {
    const { filters, search } = renderFilters("/");

    act(() => filters().setDev("exclude"));

    expect(search()).toBe("");
  });

  test("sanitizes invalid dev values and empty repeated params", () => {
    const { filters } = renderFilters("/?dev=both&build=&build=0.3.1&reached=");

    expect(filters().filters.dev).toBe("exclude");
    expect(filters().filters.build).toEqual(["0.3.1"]);
    expect(filters().filters.reached).toEqual([]);
  });

  test("toggling removes an already-selected value", () => {
    const { filters, search } = renderFilters("/?build=0.3.1&build=0.3.2");

    act(() => filters().toggleBuild("0.3.1"));

    expect(search()).toBe("build=0.3.2");
  });

  test("clear resets the URL to defaults", () => {
    const { filters, search } = renderFilters("/?dev=only&name=ev&build=0.3.1&reached=g1");

    act(() => filters().clear());

    expect(search()).toBe("");
    expect(filters().filters).toEqual({ dev: "exclude", name: "", build: [], reached: [] });
  });

  test("preserves unrelated query params on write", () => {
    const { filters, search } = renderFilters("/?sort=name&build=0.3.1");

    act(() => filters().setDev("only"));

    expect(search()).toBe("sort=name&dev=only&build=0.3.1");
  });
});
