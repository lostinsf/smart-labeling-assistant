import type { Category } from "../types/labeling";

export const categoryCodeMap: Record<Category, string> = {
  패션: "CAT-001",
  뷰티: "CAT-002",
  식품: "CAT-003",
  가전: "CAT-004",
  디지털: "CAT-005",
  리빙: "CAT-006",
  스포츠: "CAT-007",
  유아: "CAT-008",
  반려동물: "CAT-009",
  기타: "CAT-010"
};

export function getCategoryCode(category: string) {
  return categoryCodeMap[(category as Category) || "기타"] || categoryCodeMap["기타"];
}
