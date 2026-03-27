import type {
  HealthResponse,
  LabelingResponse,
  ProductInput,
  Recommendation,
  ValidationResult
} from "../types/labeling";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    throw new Error("API 요청에 실패했습니다.");
  }

  return response.json() as Promise<T>;
}

export function fetchRecommendation(input: ProductInput) {
  return request<LabelingResponse>("/api/recommend", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function fetchValidation(payload: {
  recommendation: Recommendation;
  selectedCategory: string;
}) {
  return request<ValidationResult>("/api/validate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchHealth() {
  return request<HealthResponse>("/api/health", {
    method: "GET"
  });
}
