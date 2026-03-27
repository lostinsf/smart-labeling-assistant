import { categories } from "../lib/categories";
import { useLabelingStore } from "../store/useLabelingStore";

function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function RecommendationSection() {
  const recommendation = useLabelingStore((state) => state.recommendation);
  const selectedCategory = useLabelingStore((state) => state.selectedCategory);
  const setSelectedCategory = useLabelingStore((state) => state.setSelectedCategory);
  const validateSelection = useLabelingStore((state) => state.validateSelection);
  const isLoadingValidation = useLabelingStore((state) => state.isLoadingValidation);

  return (
    <section
      aria-busy={isLoadingValidation}
      className="rounded-[28px] bg-ink p-5 text-white shadow-panel sm:p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-mist">
        02 Recommend
      </p>
      <h2 className="mt-2 text-2xl font-bold">AI 라벨 추천</h2>

      {recommendation ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-3xl bg-white/10 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-mist">추천 카테고리</p>
                <p className="mt-2 text-3xl font-bold sm:text-4xl">{recommendation.category}</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:max-w-[220px] sm:justify-end">
                <div className="rounded-full bg-white/15 px-3 py-1 text-sm">
                  신뢰도 {recommendation.confidence}%
                </div>
                <div className="rounded-full border border-white/15 px-3 py-1 text-xs text-mist">
                  {recommendation.source === "llm" ? "OpenAI 추천" : "룰 기반 추천"}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-200">{recommendation.reason}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {recommendation.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-white/20 px-3 py-1 text-sm text-mist"
                >
                  #{keyword}
                </span>
              ))}
            </div>

            {recommendation.matchedSignals.length > 0 && (
              <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  추천 근거
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendation.matchedSignals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-white/15 px-3 py-1 text-xs text-white"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recommendation.alternatives.length > 0 && (
              <div className="mt-4 rounded-2xl border border-white/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  후보 카테고리
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendation.alternatives.map((item) => (
                    <span
                      key={`${item.category}-${item.score}`}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-mist"
                    >
                      {item.category} {item.score}점
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              03 User Choice
            </p>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-mist">
                사용자 최종 카테고리 선택
              </span>
              <select
                value={selectedCategory}
                onChange={(event) => {
                  setSelectedCategory(event.target.value);
                }}
                disabled={isLoadingValidation}
                className="w-full rounded-2xl border border-white/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-coral disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">카테고리를 선택하세요</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-100">
                AI 추천은 참고용입니다. 사용자 선택을 마친 뒤 검증을 실행해 주세요.
              </p>
              <button
                type="button"
                onClick={() => void validateSelection()}
                disabled={!selectedCategory || isLoadingValidation}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-coral px-4 py-3 text-sm font-medium text-white transition hover:bg-[#ff6844] disabled:cursor-not-allowed disabled:bg-white/20 sm:w-auto sm:px-5 sm:py-2.5"
              >
                {isLoadingValidation ? (
                  <>
                    <LoadingSpinner />
                    <span>검증 실행 중</span>
                  </>
                ) : (
                  "검증 실행"
                )}
              </button>
            </div>

            {isLoadingValidation && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm leading-6 text-slate-100">
                추천 카테고리와 사용자 선택값을 비교해 적절함 여부를 확인하고 있습니다.
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm leading-6 text-slate-100">
              {selectedCategory
                ? "사용자 선택이 완료되었습니다. 검증 실행 버튼으로 다음 단계로 넘어가세요."
                : "카테고리를 아직 선택하지 않았습니다."}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-white/20 p-5 text-sm leading-6 text-slate-300">
          상품 정보를 입력하고 추천을 실행하면 카테고리, 키워드, 추천 근거가 이 영역에
          표시됩니다.
        </div>
      )}
    </section>
  );
}
