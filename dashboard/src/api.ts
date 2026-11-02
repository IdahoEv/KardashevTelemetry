export interface Health {
  status: string;
  session_count: number;
}

export async function fetchHealth(): Promise<Health> {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error(`health request failed: ${response.status}`);
  return response.json();
}

export type DevMode = "exclude" | "include" | "only";

export interface SessionSummary {
  session_id: string;
  install_id: string;
  player_name: string | null;
  build_version: string | null;
  build_commit: string | null;
  wall_time_s: number;
  sim_time_s: number | null;
  goals: string[];
  last_goal: string | null;
  dev: boolean;
  event_count: number;
  ended: boolean;
}

export interface SessionsResponse {
  total_unfiltered: number;
  total: number;
  sessions: SessionSummary[];
}

export interface SessionFilterParams {
  dev: DevMode;
  name: string;
  build: string[];
  reached: string[];
}

export const DEFAULT_SESSION_FILTERS: SessionFilterParams = {
  dev: "exclude",
  name: "",
  build: [],
  reached: [],
};

export function filtersToParams(filters: SessionFilterParams): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.dev !== "exclude") params.set("dev", filters.dev);
  const name = filters.name.trim();
  if (name) params.set("name", name);
  for (const build of filters.build) {
    if (build) params.append("build", build);
  }
  for (const goal of filters.reached) {
    if (goal) params.append("reached", goal);
  }
  return params;
}

export async function fetchSessions(
  filters: SessionFilterParams,
): Promise<SessionsResponse> {
  const params = filtersToParams(filters);
  const query = params.size > 0 ? `?${params}` : "";
  const response = await fetch(`/api/sessions${query}`);
  if (!response.ok) throw new Error(`sessions request failed: ${response.status}`);
  return response.json();
}

export interface Aggregate {
  n: number;
  median: number | null;
  mean: number | null;
}

export interface GoalStats {
  reached: number;
  reach_rate: number;
  time_to_goal: Aggregate & { min: number | null; max: number | null };
}

export interface StatsResponse {
  sessions: number;
  wall_time_s: Aggregate;
  sim_time_s: Aggregate;
  stalls_per_session: { n: number; mean: number | null };
  events_per_session: { n: number; median: number | null };
  goals: Record<string, GoalStats>;
}

export async function fetchStats(filters: SessionFilterParams): Promise<StatsResponse> {
  const params = filtersToParams(filters);
  const query = params.size > 0 ? `?${params}` : "";
  const response = await fetch(`/api/stats${query}`);
  if (!response.ok) throw new Error(`stats request failed: ${response.status}`);
  return response.json();
}

export interface GoalTime {
  goal: string;
  sim_time_s: number;
}

export interface BuildingsData {
  types: string[];
  series: { sim_time_s: number; counts: Record<string, number> }[];
}

export interface SessionDetail extends SessionSummary {
  goal_times: GoalTime[];
  buildings: BuildingsData;
}

/** Returns null on 404, unlike the other wrappers, so the page can branch on it. */
export async function fetchSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`session detail request failed: ${response.status}`);
  return response.json();
}
