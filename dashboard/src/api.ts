export interface Health {
  status: string;
  session_count: number;
}

export async function fetchHealth(): Promise<Health> {
  const response = await fetch("/api/health");
  if (!response.ok) throw new Error(`health request failed: ${response.status}`);
  return response.json();
}
