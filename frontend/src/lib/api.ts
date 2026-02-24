import type {
  SessionResponse,
  DesignCreateRequest,
  DesignResponse,
  ProcessResponse,
  JobStatus,
  SearchRequest,
  SearchResponse,
  HistoryResponse,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }
  return res.json();
}

export async function createSession(): Promise<SessionResponse> {
  return request("/api/sessions", { method: "POST" });
}

export async function createDesign(
  data: DesignCreateRequest
): Promise<DesignResponse> {
  return request("/api/designs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function processDesign(
  designId: string
): Promise<ProcessResponse> {
  return request(`/api/designs/${designId}/process`, { method: "POST" });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return request(`/api/jobs/${jobId}`);
}

export async function search(data: SearchRequest): Promise<SearchResponse> {
  return request("/api/search", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSessionHistory(
  sessionId: string
): Promise<HistoryResponse> {
  return request(`/api/sessions/${sessionId}/history`);
}

export async function pollJobUntilDone(
  jobId: string,
  onProgress?: (status: JobStatus) => void,
  intervalMs = 2000,
  maxAttempts = 60
): Promise<JobStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getJobStatus(jobId);
    onProgress?.(status);
    if (status.status === "done" || status.status === "failed") {
      return status;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Job polling timed out");
}
