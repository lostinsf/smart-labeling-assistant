import { useMemo } from "react";
import { getCategoryCode } from "../lib/categoryMeta";
import { useLabelingStore } from "../store/useLabelingStore";

function LoadingSpinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
  );
}

export function ValidationSection() {
  const input = useLabelingStore((state) => state.input);
  const recommendation = useLabelingStore((state) => state.recommendation);
  const selectedCategory = useLabelingStore((state) => state.selectedCategory);
  const validation = useLabelingStore((state) => state.validation);
  const saveValidatedRecord = useLabelingStore((state) => state.saveValidatedRecord);
  const savedRecords = useLabelingStore((state) => state.savedRecords);
  const isLoadingValidation = useLabelingStore((state) => state.isLoadingValidation);

  const tone = useMemo(() => {
    if (isLoadingValidation) {
      return "border-coral/30 bg-coral/10 text-coral";
    }

    if (validation.status === "matched") {
      return "border-teal/30 bg-teal/10 text-teal";
    }

    if (validation.status === "mismatched") {
      return "border-coral/30 bg-coral/10 text-coral";
    }

    return "border-slate-200 bg-white text-slate-600";
  }, [isLoadingValidation, validation.status]);

  const latestSavedRecord = savedRecords[0];

  return (
    <section
      aria-busy={isLoadingValidation}
      className="rounded-[28px] bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">
        03 Validate
      </p>
      <h2 className="mt-2 text-2xl font-bold text-ink">라벨 검증</h2>

      <div className={`mt-5 rounded-3xl border p-4 transition sm:p-5 ${tone}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium">검증 결과</p>
            <p className="mt-2 flex items-center gap-2 text-3xl font-bold">
              {isLoadingValidation && <LoadingSpinner />}
              {isLoadingValidation
                ? "검증 중"
                : validation.status === "matched"
                  ? "적절함"
                  : validation.status === "mismatched"
                    ? "불일치"
                    : "대기 중"}
            </p>
          </div>
          {recommendation && (
            <div className="text-sm leading-6 sm:text-right">
              <div>AI 추천: {recommendation.category}</div>
              <div>사용자 선택: {selectedCategory || "미선택"}</div>
            </div>
          )}
        </div>
        <p className="mt-4 text-sm leading-6">
          {isLoadingValidation
            ? "검증 로직을 실행해 추천값과 사용자 선택값을 비교하고 있습니다."
            : validation.message}
        </p>
        {!isLoadingValidation && validation.detail && (
          <p className="mt-2 text-sm leading-6 opacity-90">{validation.detail}</p>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-sm font-semibold text-ink">저장용 검증 레코드</p>
            <p className="text-sm leading-6 text-slate-500">
              추후 DB에 저장할 수 있도록 현재 검증 결과를 레코드 형태로 미리 보여줍니다.
            </p>
          </div>
          <button
            type="button"
            onClick={saveValidatedRecord}
            disabled={!recommendation || !selectedCategory || validation.status === "idle" || isLoadingValidation}
            className="w-full rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:px-5 sm:py-2.5"
          >
            저장 대기 등록
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left">항목</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left">값</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">상품명</td>
                <td className="border-b border-slate-100 px-4 py-3 text-ink">{input.name || "-"}</td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">AI 추천 카테고리</td>
                <td className="border-b border-slate-100 px-4 py-3 text-ink">{recommendation?.category || "-"}</td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">사용자 선택 카테고리</td>
                <td className="border-b border-slate-100 px-4 py-3 text-ink">{selectedCategory || "-"}</td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">내부 카테고리 코드</td>
                <td className="border-b border-slate-100 px-4 py-3 text-ink">
                  {selectedCategory ? getCategoryCode(selectedCategory) : "-"}
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">검증 상태</td>
                <td className="border-b border-slate-100 px-4 py-3 text-ink">
                  {isLoadingValidation
                    ? "검증 중"
                    : validation.status === "matched"
                      ? "적절함"
                      : validation.status === "mismatched"
                        ? "불일치"
                        : "대기 중"}
                </td>
              </tr>
              <tr>
                <td className="border-b border-slate-100 px-4 py-3 font-medium text-slate-600">추천 소스</td>
                <td className="border-b border-slate-100 px-4 py-3 text-ink">
                  {recommendation?.source === "llm"
                    ? "OpenAI 추천"
                    : recommendation
                      ? "룰 기반 추천"
                      : "-"}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-600">저장 대기 번호</td>
                <td className="px-4 py-3 text-ink">
                  {latestSavedRecord
                    ? `LBL-${String(latestSavedRecord.sequence + 1).padStart(4, "0")}`
                    : "LBL-0001"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
