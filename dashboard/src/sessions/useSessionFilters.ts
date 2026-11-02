import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import {
  DEFAULT_SESSION_FILTERS,
  filtersToParams,
  type DevMode,
  type SessionFilterParams,
} from "../api";

const DEV_MODES: readonly DevMode[] = ["exclude", "include", "only"];
const FILTER_KEYS = ["dev", "name", "build", "reached"] as const;

function parseDev(value: string | null): DevMode {
  return DEV_MODES.includes(value as DevMode) ? (value as DevMode) : "exclude";
}

function parseFilters(params: URLSearchParams): SessionFilterParams {
  return {
    dev: parseDev(params.get("dev")),
    name: params.get("name") ?? "",
    build: params.getAll("build").filter((value) => value !== ""),
    reached: params.getAll("reached").filter((value) => value !== ""),
  };
}

export function useSessionFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const update = useCallback(
    (next: SessionFilterParams, replace: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of FILTER_KEYS) params.delete(key);
      for (const [key, value] of filtersToParams(next)) params.append(key, value);
      setSearchParams(params, { replace });
    },
    [searchParams, setSearchParams],
  );

  const setDev = useCallback(
    (dev: DevMode) => update({ ...filters, dev }, false),
    [filters, update],
  );

  const setName = useCallback(
    (name: string) => update({ ...filters, name }, true),
    [filters, update],
  );

  const toggleBuild = useCallback(
    (build: string) => {
      const next = filters.build.includes(build)
        ? filters.build.filter((value) => value !== build)
        : [...filters.build, build];
      update({ ...filters, build: next }, false);
    },
    [filters, update],
  );

  const toggleReached = useCallback(
    (goal: string) => {
      const next = filters.reached.includes(goal)
        ? filters.reached.filter((value) => value !== goal)
        : [...filters.reached, goal];
      update({ ...filters, reached: next }, false);
    },
    [filters, update],
  );

  const clear = useCallback(() => update(DEFAULT_SESSION_FILTERS, true), [update]);

  const hasActiveFilters =
    filters.dev !== "exclude" ||
    filters.name.trim() !== "" ||
    filters.build.length > 0 ||
    filters.reached.length > 0;

  return { filters, hasActiveFilters, setDev, setName, toggleBuild, toggleReached, clear };
}
