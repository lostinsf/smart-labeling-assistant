import { useLabelingStore } from "../store/useLabelingStore";

function LoadingSpinner({
  className = ""
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function ProductInputSection() {
  const input = useLabelingStore((state) => state.input);
  const autocompleteKeywords = useLabelingStore((state) => state.autocompleteKeywords);
  const hasPendingInputChanges = useLabelingStore((state) => state.hasPendingInputChanges);
  const isLoadingRecommendation = useLabelingStore((state) => state.isLoadingRecommendation);
  const setField = useLabelingStore((state) => state.setField);
  const requestRecommendation = useLabelingStore((state) => state.requestRecommendation);
  const canRecommend = `${input.name} ${input.description}`.trim().length > 0;

  return (
    <section
      aria-busy={isLoadingRecommendation}
      className="rounded-[28px] bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">
            01 Input
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">상품 정보 입력</h2>
        </div>
        <button
          type="button"
          onClick={() => void requestRecommendation()}
          disabled={!canRecommend || isLoadingRecommendation}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:px-5 sm:py-2.5"
        >
          {isLoadingRecommendation ? (
            <>
              <LoadingSpinner />
              <span>추천 생성 중</span>
            </>
          ) : (
            "AI 추천 실행"
          )}
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">상품명</span>
          <input
            value={input.name}
            onChange={(event) => setField("name", event.target.value)}
            disabled={isLoadingRecommendation}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-coral focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 sm:text-base"
            placeholder="예: 세라마이드 보습 크림 50ml"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">상품 설명</span>
          <textarea
            value={input.description}
            onChange={(event) => setField("description", event.target.value)}
            disabled={isLoadingRecommendation}
            className="min-h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-coral focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100 sm:min-h-36 sm:text-base"
            placeholder="용도, 특징, 성분, 사용 환경처럼 추천에 도움이 되는 설명을 입력해주세요."
          />
        </label>

        {isLoadingRecommendation && (
          <div className="rounded-2xl border border-coral/20 bg-coral/5 px-4 py-3 text-sm leading-6 text-slate-700">
            상품 정보를 분석하고 있습니다. 추천 카테고리와 키워드가 준비되면 다음 단계로
            넘어갈 수 있습니다.
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">키워드 힌트</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            입력을 마친 뒤 `AI 추천 실행`을 누르면 다음 단계로 넘어갑니다.
            {hasPendingInputChanges
              ? " 현재 입력이 변경되어 추천을 다시 받아야 합니다."
              : " 현재 추천 결과와 입력 상태가 맞춰져 있습니다."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {autocompleteKeywords.length > 0 ? (
              autocompleteKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-white px-3 py-1 text-sm text-slate-700"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                추천을 실행하면 관련 키워드가 이 영역에 표시됩니다.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
