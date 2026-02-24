export interface SessionResponse {
  session_id: string;
}

export interface DesignCreateRequest {
  session_id: string;
  input_mode: "text" | "canvas";
  category_hint?: string;
  text_prompt?: string;
  canvas_data?: string;
}

export interface DesignResponse {
  design_id: string;
  status: string;
}

export interface ProcessResponse {
  job_id: string;
  status: string;
}

export interface JobStatus {
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
  progress: number;
  error_code?: string;
  ai_image_url?: string;
  keywords?: string[];
  dominant_color?: string;
}

export interface SearchRequest {
  design_id: string;
  providers?: string[];
  limit?: number;
}

export interface SearchResultItem {
  title: string;
  image_url: string | null;
  product_url: string | null;
  price: number | null;
  score_overall: number;
  score_keyword: number;
  score_color: number;
  score_embedding: number;
  explanation: string[];
}

export interface SearchResponse {
  results: SearchResultItem[];
}

// History types
export interface HistoryResultItem {
  title: string;
  image_url: string | null;
  product_url: string | null;
  score_overall: number;
}

export interface HistoryItem {
  design_id: string;
  text_prompt: string | null;
  category_hint: string | null;
  input_mode: "text" | "canvas";
  created_at: string;
  ai_image_url: string | null;
  keywords: string[];
  dominant_color: string | null;
  top_results: HistoryResultItem[];
}

export interface HistoryResponse {
  session_id: string;
  items: HistoryItem[];
  total: number;
}
