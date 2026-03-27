import type { SavedLabelRecord, Stats, ValidationHistoryItem } from "../types/labeling";

function escapeCsvCell(value: string | number) {
  const text = String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", { hour12: false });
}

function buildRows(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

export function downloadQualityReportCsv(params: {
  stats: Stats;
  history: ValidationHistoryItem[];
  savedRecords: SavedLabelRecord[];
}) {
  const { stats, history, savedRecords } = params;
  const successRate =
    stats.totalChecks === 0 ? 0 : Math.round((stats.matchedChecks / stats.totalChecks) * 100);
  const mismatchedCount = history.filter((item) => item.status === "mismatched").length;

  const summaryRows = [
    ["품질 추적 리포트"],
    ["생성 시각", new Date().toLocaleString("ko-KR", { hour12: false })],
    [],
    ["요약 지표"],
    ["총 검증 수", stats.totalChecks],
    ["일치 건수", stats.matchedChecks],
    ["불일치 건수", mismatchedCount],
    ["검증 성공률", `${successRate}%`],
    ["저장 대기 레코드 수", savedRecords.length],
    []
  ];

  const historyRows: Array<Array<string | number>> = [
    ["최근 검증 이력"],
    ["상품명", "AI 추천", "사용자 선택", "검증 상태", "추천 소스", "검증 시각"],
    ...history.map((item) => [
      item.productName,
      item.recommendedCategory,
      item.selectedCategory,
      item.status === "matched" ? "적절함" : item.status === "mismatched" ? "불일치" : "대기 중",
      item.source === "llm" ? "OpenAI 추천" : "룰 기반 추천",
      formatDate(item.createdAt)
    ]),
    []
  ];

  const savedRecordRows: Array<Array<string | number>> = [
    ["저장 대기 레코드"],
    [
      "저장 번호",
      "상품명",
      "내부 카테고리 코드",
      "AI 추천",
      "사용자 선택",
      "검증 상태",
      "추천 소스",
      "생성 시각"
    ],
    ...savedRecords.map((record) => [
      `LBL-${String(record.sequence).padStart(4, "0")}`,
      record.productName,
      record.internalCategoryCode,
      record.recommendedCategory,
      record.selectedCategory,
      record.validationStatus === "matched"
        ? "적절함"
        : record.validationStatus === "mismatched"
          ? "불일치"
          : "대기 중",
      record.recommendationSource === "llm" ? "OpenAI 추천" : "룰 기반 추천",
      formatDate(record.createdAt)
    ])
  ];

  const csvContent = [buildRows(summaryRows), buildRows(historyRows), buildRows(savedRecordRows)]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  link.href = url;
  link.download = `quality-report-${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
