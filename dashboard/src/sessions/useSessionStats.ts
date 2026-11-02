import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchStats, type SessionFilterParams } from "../api";

export function useSessionStats(filters: SessionFilterParams) {
  return useQuery({
    queryKey: ["stats", filters],
    queryFn: () => fetchStats(filters),
    placeholderData: keepPreviousData,
  });
}
