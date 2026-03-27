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

interface RuleSet {
  category: Category;
  keywords: Array<{
    term: string;
    weight: number;
  }>;
  reason: string;
}

const rules: RuleSet[] = [
  {
    category: "뷰티",
    keywords: [
      { term: "크림", weight: 3 },
      { term: "세럼", weight: 4 },
      { term: "토너", weight: 3 },
      { term: "선크림", weight: 5 },
      { term: "마스크팩", weight: 5 },
      { term: "보습", weight: 2 },
      { term: "스킨케어", weight: 4 },
      { term: "세라마이드", weight: 4 },
      { term: "피부", weight: 1 }
    ],
    reason: "화장품과 스킨케어 관련 표현이 확인되어 뷰티 카테고리로 분류했습니다."
  },
  {
    category: "식품",
    keywords: [
      { term: "간식", weight: 3 },
      { term: "음료", weight: 3 },
      { term: "커피", weight: 4 },
      { term: "단백질", weight: 3 },
      { term: "시리얼", weight: 4 },
      { term: "비타민", weight: 4 },
      { term: "유기농", weight: 2 },
      { term: "홍삼", weight: 4 },
      { term: "건강식", weight: 4 }
    ],
    reason: "식품 또는 섭취 목적의 표현이 포함되어 식품 카테고리로 판단했습니다."
  },
  {
    category: "가전",
    keywords: [
      { term: "청소기", weight: 5 },
      { term: "에어프라이어", weight: 5 },
      { term: "정수기", weight: 5 },
      { term: "건조기", weight: 4 },
      { term: "냉장고", weight: 5 },
      { term: "세탁기", weight: 5 },
      { term: "공기청정기", weight: 5 },
      { term: "가습기", weight: 4 }
    ],
    reason: "생활 가전 제품을 나타내는 키워드가 포함되어 있습니다."
  },
  {
    category: "디지털",
    keywords: [
      { term: "이어폰", weight: 5 },
      { term: "키보드", weight: 4 },
      { term: "마우스", weight: 4 },
      { term: "모니터", weight: 5 },
      { term: "태블릿", weight: 5 },
      { term: "스마트워치", weight: 5 },
      { term: "usb", weight: 3 },
      { term: "블루투스", weight: 3 },
      { term: "충전", weight: 1 },
      { term: "노이즈캔슬링", weight: 4 }
    ],
    reason: "IT 기기 또는 액세서리 특성이 강해 디지털 카테고리로 추천합니다."
  },
  {
    category: "패션",
    keywords: [
      { term: "셔츠", weight: 4 },
      { term: "원피스", weight: 5 },
      { term: "니트", weight: 4 },
      { term: "팬츠", weight: 4 },
      { term: "가방", weight: 3 },
      { term: "스니커즈", weight: 5 },
      { term: "아우터", weight: 4 },
      { term: "재킷", weight: 4 },
      { term: "의류", weight: 2 }
    ],
    reason: "의류와 패션 잡화 관련 키워드가 감지되었습니다."
  },
  {
    category: "리빙",
    keywords: [
      { term: "수납", weight: 3 },
      { term: "침구", weight: 5 },
      { term: "디퓨저", weight: 4 },
      { term: "주방", weight: 2 },
      { term: "식기", weight: 4 },
      { term: "행거", weight: 4 },
      { term: "커튼", weight: 4 },
      { term: "인테리어", weight: 2 },
      { term: "정리", weight: 1 }
    ],
    reason: "공간 관리와 생활용품 성격이 강해 리빙으로 분류했습니다."
  },
  {
    category: "스포츠",
    keywords: [
      { term: "러닝", weight: 4 },
      { term: "요가", weight: 4 },
      { term: "덤벨", weight: 5 },
      { term: "운동화", weight: 3 },
      { term: "골프", weight: 5 },
      { term: "테니스", weight: 5 },
      { term: "헬스", weight: 4 },
      { term: "트레이닝", weight: 4 }
    ],
    reason: "운동과 액티비티 맥락이 있어 스포츠 카테고리가 적합합니다."
  },
  {
    category: "유아",
    keywords: [
      { term: "젖병", weight: 5 },
      { term: "기저귀", weight: 5 },
      { term: "유아", weight: 4 },
      { term: "아기", weight: 4 },
      { term: "분유", weight: 5 },
      { term: "유모차", weight: 5 },
      { term: "놀이", weight: 2 },
      { term: "이유식", weight: 4 }
    ],
    reason: "영유아 대상 상품 키워드가 포함되어 있습니다."
  },
  {
    category: "반려동물",
    keywords: [
      { term: "강아지", weight: 4 },
      { term: "고양이", weight: 4 },
      { term: "사료", weight: 5 },
      { term: "간식캔", weight: 4 },
      { term: "캣타워", weight: 5 },
      { term: "하네스", weight: 4 },
      { term: "장난감", weight: 2 },
      { term: "반려", weight: 3 }
    ],
    reason: "반려동물 전용 상품 표현이 보여 반려동물 카테고리로 추천합니다."
  }
];

const fallbackKeywords = ["베스트", "실속형", "인기", "데일리", "프리미엄"];

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function extractTokens(text: string) {
  return Array.from(
    new Set(
      text
        .split(/[^a-z0-9가-힣]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  );
}

function buildReason(category: Category, matchedSignals: string[], alternatives: string[]) {
  if (matchedSignals.length === 0) {
    return "명확한 카테고리 신호가 약해 기타로 분류했습니다. 상세 설명을 추가하면 정확도가 올라갑니다.";
  }

  const signalSummary = matchedSignals.slice(0, 3).join(", ");
  const alternativeSummary =
    alternatives.length > 0
      ? ` 다만 ${alternatives.join(", ")} 카테고리도 함께 검토할 필요가 있습니다.`
      : "";

  return `${signalSummary} 신호가 강하게 감지되어 ${category} 카테고리로 추천했습니다.${alternativeSummary}`;
}

export function recommendLabel(payload: { name?: string; description?: string }) {
  const source = normalize(`${payload.name || ""} ${payload.description || ""}`);
  const tokens = extractTokens(source);
  const scoredRules = rules
    .map((rule) => {
      const matches = rule.keywords.filter(({ term }) => source.includes(term.toLowerCase()));
      const tokenMatches = rule.keywords.filter(({ term }) => tokens.includes(term.toLowerCase()));
      const score =
        matches.reduce((count, keyword) => count + keyword.weight, 0) +
        tokenMatches.reduce((count, keyword) => count + keyword.weight, 0);

      return {
        ...rule,
        score,
        matchedSignals: Array.from(new Set(matches.map(({ term }) => term)))
      };
    })
    .sort((left, right) => right.score - left.score);

  const bestRule = scoredRules[0];
  const alternatives = scoredRules
    .filter((rule) => rule.score > 0 && rule.category !== bestRule?.category)
    .slice(0, 2)
    .map((rule) => ({
      category: rule.category,
      score: rule.score
    }));

  const keywordPool = [
    ...(bestRule?.matchedSignals || []),
    ...tokens.slice(0, 6),
    ...fallbackKeywords
  ];

  const keywords = Array.from(new Set(keywordPool)).slice(0, 6);
  const category = bestRule && bestRule.score > 0 ? bestRule.category : "기타";
  const confidence =
    bestRule && bestRule.score > 0
      ? Math.min(97, 48 + bestRule.score * 6 + Math.min(bestRule.matchedSignals.length * 4, 12))
      : 38;
  const matchedSignals = bestRule?.matchedSignals || [];
  const alternativeLabels = alternatives.map((item) => item.category);

  return {
    recommendation: {
      category,
      keywords,
      confidence,
      source: "rule",
      reason:
        bestRule && bestRule.score > 0
          ? `${bestRule.reason} ${buildReason(category, matchedSignals, alternativeLabels)}`
          : buildReason(category, matchedSignals, alternativeLabels),
      matchedSignals,
      alternatives
    },
    autocompleteKeywords: keywords
  };
}

export function validateLabel(payload: {
  recommendation?: { category?: string };
  selectedCategory?: string;
}) {
  const recommendedCategory = payload.recommendation?.category || "";
  const selectedCategory = payload.selectedCategory || "";

  if (!recommendedCategory || !selectedCategory) {
    return {
      status: "idle",
      message: "비교할 카테고리 정보가 부족합니다.",
      detail: "추천 결과와 사용자 선택값이 모두 있어야 검증할 수 있습니다."
    };
  }

  if (recommendedCategory === selectedCategory) {
    return {
      status: "matched",
      message: "AI 추천과 사용자 선택이 일치합니다. 라벨 품질이 안정적입니다.",
      detail: "현재 상품 설명과 분류 기준이 같은 방향으로 해석되고 있어 추가 확인 비용이 낮습니다."
    };
  }

  return {
    status: "mismatched",
    message: `AI는 ${recommendedCategory}을 추천했지만 사용자는 ${selectedCategory}을 선택했습니다. 설명 또는 라벨 기준을 다시 확인해주세요.`,
    detail:
      "이런 불일치는 상품 설명이 모호하거나 카테고리 기준이 겹칠 때 자주 발생합니다. 설명 보완 또는 운영 기준 확인이 필요합니다."
  };
}
