import { useEffect } from "react";
import { BatchUploadSection } from "./components/BatchUploadSection";
import { ProductInputSection } from "./components/ProductInputSection";
import { RecommendationSection } from "./components/RecommendationSection";
import { ResultSection } from "./components/ResultSection";
import { ValidationSection } from "./components/ValidationSection";
import { useLabelingStore } from "./store/useLabelingStore";

function StatusPill({
  label,
  value,
  active
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
      <span
        className={`h-2.5 w-2.5 rounded-full ${active ? "bg-teal" : "bg-slate-300"}`}
      />
      <span className="uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

export default function App() {
  const loadHealth = useLabelingStore((state) => state.loadHealth);
  const health = useLabelingStore((state) => state.health);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
        <StatusPill
          label="Mode"
          value={(health?.aiMode || "확인 중").toUpperCase()}
          active={health?.aiMode === "auto"}
        />
        <StatusPill
          label="OpenAI"
          value={health?.aiReady ? "ON" : "OFF"}
          active={Boolean(health?.aiReady)}
        />
      </section>

      <section className="mb-6 flex flex-col gap-4 lg:mb-8 lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
        <div className="rounded-[28px] bg-white/65 p-5 shadow-panel backdrop-blur sm:p-6 lg:rounded-[32px] lg:p-7 xl:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-coral sm:text-sm">
            Smart Labeling
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-ink sm:mt-4 sm:text-4xl lg:text-5xl">
            라벨링 보조 시스템
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:mt-4 sm:text-base sm:leading-7">
            상품명과 설명을 바탕으로 카테고리 추천과 검증 흐름을 한 화면에서 처리하고,
            불일치 사례를 빠르게 찾아 품질을 높이는 도구입니다.
          </p>
        </div>

        <div className="rounded-[28px] bg-coral p-5 text-white shadow-panel sm:p-6 lg:rounded-[32px] lg:p-7 xl:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75 sm:text-sm">
            Quality Focus
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-white/90 sm:mt-6 sm:space-y-4 sm:leading-7">
            <p>추천은 빠르게 제공하고, 최종 판단은 사용자가 검증하도록 분리했습니다.</p>
            <p>AI 추천과 사용자 선택의 차이를 바로 보여줘 검수 포인트를 놓치지 않습니다.</p>
            <p>최근 검증 이력과 저장 대기 레코드까지 이어져 운영 흐름으로 확장하기 쉽습니다.</p>
          </div>
        </div>
      </section>

      <section className="mb-4 sm:mb-6">
        <BatchUploadSection />
      </section>

      <section className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-start lg:gap-6">
        <div className="lg:col-start-1 lg:row-start-1">
          <ProductInputSection />
        </div>

        <div className="lg:col-start-2 lg:row-start-1">
          <RecommendationSection />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <ValidationSection />
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <ResultSection />
        </div>
      </section>
    </main>
  );
}
