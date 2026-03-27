export type Category =
  | "패션"
  | "뷰티"
  | "식품"
  | "가전"
  | "디지털"
  | "리빙"
  | "스포츠"
  | "유아"
  | "반려동물"
  | "기타";

export type ValidationStatus = "idle" | "matched" | "mismatched";

export interface ProductInput {
  name: string;
  description: string;
}

export interface Recommendation {
  category: Category;
  keywords: string[];
  confidence: number;
  reason: string;
  source: "rule" | "llm";
  matchedSignals: string[];
  alternatives: Array<{
    category: Category;
    score: number;
  }>;
}

export interface ValidationResult {
  status: ValidationStatus;
  message: string;
  detail?: string;
}

export interface Stats {
  totalChecks: number;
  matchedChecks: number;
}

export interface ValidationHistoryItem {
  id: string;
  productName: string;
  recommendedCategory: string;
  selectedCategory: string;
  status: ValidationStatus;
  source: "rule" | "llm";
  createdAt: string;
}

export interface SavedLabelRecord {
  id: string;
  sequence: number;
  productName: string;
  rawDescription: string;
  recommendedCategory: string;
  selectedCategory: string;
  internalCategoryCode: string;
  validationStatus: ValidationStatus;
  recommendationSource: "rule" | "llm";
  createdAt: string;
}

export interface LabelingResponse {
  recommendation: Recommendation;
  autocompleteKeywords: string[];
}

export interface HealthResponse {
  status: string;
  service: string;
  aiMode: string;
  aiReady: boolean;
  aiKeyLength?: number;
}
