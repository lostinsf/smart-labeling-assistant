import { useState } from "react";
import { downloadQualityReportCsv } from "../lib/reportExport";
import { useLabelingStore } from "../store/useLabelingStore";

function toPercent(totalChecks: number, matchedChecks: number) {
  if (totalChecks === 0) {
    return 0;
  }

  return Math.round((matchedChecks / totalChecks) * 100);
}

export function ResultSection() {
  const stats = useLabelingStore((state) => state.stats);
  const history = useLabelingStore((state) => state.history);
  const savedRecords = useLabelingStore((state) => state.savedRecords);
  const error = useLabelingStore((state) => state.error);
  const clearHistory = useLabelingStore((state) => state.clearHistory);
  const [showOnlyMismatched, setShowOnlyMismatched] = useState(false);

  const mismatchedHistory = history.filter((item) => item.status === "mismatched");
  const visibleHistory = showOnlyMismatched ? mismatchedHistory : history;
  const canDownloadReport = history.length > 0 || savedRecords.length > 0;
  const topMismatch = mismatchedHistory.reduce<{
    key: string;
    count: number;
    recommendedCategory: string;
    selectedCategory: string;
  } | null>((best, item) => {
    const key = `${item.recommendedCategory}->${item.selectedCategory}`;
    const count = mismatchedHistory.filter(
      (entry) =>
        entry.recommendedCategory === item.recommendedCategory &&
        entry.selectedCategory === item.selectedCategory
    ).length;

    if (!best || count > best.count) {
      return {
        key,
        count,
        recommendedCategory: item.recommendedCategory,
        selectedCategory: item.selectedCategory
      };
    }

    return best;
  }, null);

  return (
    <section className="rounded-[28px] bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">
            04 Result
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">품질 추적</h2>
        </div>
        <button
          type="button"
          onClick={() =>
            downloadQualityReportCsv({
              stats,
              history,
              savedRecords
            })
          }
          disabled={!canDownloadReport}
          className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-auto sm:px-5 sm:py-2.5"
        >
          엑셀 리포트 다운로드
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">총 검증 수</p>
          <p className="mt-2 text-3xl font-bold text-ink">{stats.totalChecks}</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">일치 건수</p>
          <p className="mt-2 text-3xl font-bold text-teal">{stats.matchedChecks}</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">검증 성공률</p>
          <p className="mt-2 text-3xl font-bold text-coral">
            {toPercent(stats.totalChecks, stats.matchedChecks)}%
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600">
        {error ||
          "이 통계는 현재 세션 기준으로 누적되며, 엑셀 리포트로 내려받아 품질 추적 자료로 활용할 수 있습니다."}
      </div>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-500">저장 대기 레코드</p>
        <p className="mt-2 text-3xl font-bold text-ink">{savedRecords.length}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          검증된 결과를 나중에 내부 DB로 넘기기 전에 임시로 쌓아두는 레코드입니다.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-coral/20 bg-coral/5 p-4">
          <p className="text-sm text-slate-500">불일치 건수</p>
          <p className="mt-2 text-3xl font-bold text-coral">{mismatchedHistory.length}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            최근 검증 중 라벨 기준을 다시 확인해야 하는 사례 수입니다.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">가장 자주 나온 충돌</p>
          <p className="mt-2 text-lg font-bold text-ink">
            {topMismatch
              ? `${topMismatch.recommendedCategory} -> ${topMismatch.selectedCategory}`
              : "아직 없음"}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {topMismatch
              ? `${topMismatch.count}회 반복되었습니다. 라벨 기준 문구를 먼저 점검해보세요.`
              : "불일치가 쌓이면 자주 충돌하는 조합이 여기에 표시됩니다."}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">최근 검증 이력</p>
          <p className="text-sm text-slate-500">최근 8건의 검증 결과를 브라우저에 저장합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyMismatched((current) => !current)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                showOnlyMismatched
                  ? "border-coral bg-coral text-white"
                  : "border-slate-300 text-slate-600 hover:border-coral hover:text-coral"
              }`}
            >
              {showOnlyMismatched ? "전체 이력 보기" : "불일치만 보기"}
            </button>
          )}
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:border-coral hover:text-coral"
            >
              이력 초기화
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {visibleHistory.length > 0 ? (
          visibleHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-ink">{item.productName}</p>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    item.status === "matched"
                      ? "bg-teal/10 text-teal"
                      : "bg-coral/10 text-coral"
                  }`}
                >
                  {item.status === "matched" ? "적절함" : "불일치"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm leading-6 text-slate-600">
                <span>AI {item.recommendedCategory}</span>
                <span>사용자 {item.selectedCategory}</span>
                <span>{item.source === "llm" ? "OpenAI 추천" : "룰 기반 추천"}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm leading-6 text-slate-500">
            {history.length > 0
              ? "현재 필터 기준에 맞는 이력이 없습니다."
              : "아직 저장된 검증 이력이 없습니다. 카테고리를 선택하고 검증을 진행해보세요."}
          </div>
        )}
      </div>
    </section>
  );
}
