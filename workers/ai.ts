import { recommendLabel, type Category } from "./engine";

interface AiEnv {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  AI_MODE?: string;
}

interface RecommendPayload {
  name?: string;
  description?: string;
}

interface AiRecommendationResponse {
  recommendation: {
    category: Category;
    keywords: string[];
    confidence: number;
    source: "llm";
    reason: string;
    matchedSignals: string[];
    alternatives: Array<{
      category: Category;
      score: number;
    }>;
  };
  autocompleteKeywords: string[];
}

interface RuleRecommendationResponse {
  recommendation: {
    category: Category;
    keywords: string[];
    confidence: number;
    source: "rule";
    reason: string;
    matchedSignals: string[];
    alternatives: Array<{
      category: Category;
      score: number;
    }>;
  };
  autocompleteKeywords: string[];
}

const allowedCategories: Category[] = [
  "패션",
  "뷰티",
  "식품",
  "가전",
  "디지털",
  "리빙",
  "스포츠",
  "유아",
  "반려동물",
  "기타"
];

export function normalizeSecretValue(value?: string) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function normalizeKeywords(keywords: unknown) {
  if (!Array.isArray(keywords)) {
    return [];
  }

  return keywords
    .map((keyword) => String(keyword).trim())
    .filter((keyword) => keyword.length >= 2)
    .slice(0, 6);
}

function extractJsonBlock(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

function parseOpenAiText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  if (Array.isArray(record.output)) {
    const texts = record.output
      .flatMap((item) => {
        if (!item || typeof item !== "object") {
          return [];
        }

        const content = (item as Record<string, unknown>).content;
        if (!Array.isArray(content)) {
          return [];
        }

        return content
          .map((part) => {
            if (!part || typeof part !== "object") {
              return "";
            }

            const partRecord = part as Record<string, unknown>;
            if (typeof partRecord.text === "string") {
              return partRecord.text;
            }

            if (
              typeof partRecord.type === "string" &&
              partRecord.type === "output_text" &&
              typeof partRecord.text === "string"
            ) {
              return partRecord.text;
            }

            return "";
          })
          .filter(Boolean);
      })
      .join("\n")
      .trim();

    if (texts) {
      return texts;
    }
  }

  return "";
}

function buildPrompt(payload: RecommendPayload, ruleResult: RuleRecommendationResponse) {
  return [
    "당신은 쇼핑 데이터 라벨링 보조 시스템의 분류 엔진입니다.",
    "반드시 JSON만 출력하세요.",
    "허용 카테고리: 패션, 뷰티, 식품, 가전, 디지털, 리빙, 스포츠, 유아, 반려동물, 기타",
    "목표는 정답 예측보다 라벨링 품질 보조입니다.",
    "애매하면 과도하게 확신하지 말고 confidence를 낮추세요.",
    "반환 형식:",
    '{"category":"카테고리","keywords":["키워드1","키워드2"],"confidence":0,"reason":"설명","matchedSignals":["근거"],"alternatives":[{"category":"후보","score":0}]}',
    "confidence는 0~100 정수입니다.",
    "alternatives는 상위 2개 이하만 넣으세요.",
    `룰기반 추천 카테고리: ${ruleResult.recommendation.category}`,
    `룰기반 신뢰도: ${ruleResult.recommendation.confidence}`,
    `룰기반 근거: ${ruleResult.recommendation.matchedSignals.join(", ") || "없음"}`,
    `상품명: ${payload.name || ""}`,
    `상품설명: ${payload.description || ""}`
  ].join("\n");
}

function coerceCategory(value: unknown): Category {
  if (typeof value === "string" && allowedCategories.includes(value as Category)) {
    return value as Category;
  }

  return "기타";
}

export async function recommendWithAi(
  payload: RecommendPayload,
  env: AiEnv,
  ruleResult: RuleRecommendationResponse
): Promise<AiRecommendationResponse | null> {
  const apiKey = normalizeSecretValue(env.OPENAI_API_KEY);

  if (!apiKey) {
    return null;
  }

  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(payload, ruleResult)
    })
  });

  if (!response.ok) {
    return null;
  }

  const raw = (await response.json()) as unknown;
  const text = parseOpenAiText(raw);
  const jsonBlock = extractJsonBlock(text);

  if (!jsonBlock) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonBlock) as Record<string, unknown>;
    const category = coerceCategory(parsed.category);
    const keywords = normalizeKeywords(parsed.keywords);
    const matchedSignals = normalizeKeywords(parsed.matchedSignals);
    const alternatives = Array.isArray(parsed.alternatives)
      ? parsed.alternatives
          .map((item) => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const record = item as Record<string, unknown>;
            return {
              category: coerceCategory(record.category),
              score: Number(record.score) || 0
            };
          })
          .filter((item): item is { category: Category; score: number } => Boolean(item))
          .slice(0, 2)
      : [];

    return {
      recommendation: {
        category,
        keywords: keywords.length > 0 ? keywords : ruleResult.recommendation.keywords,
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
        source: "llm",
        reason:
          typeof parsed.reason === "string" && parsed.reason.trim()
            ? parsed.reason
            : "OpenAI 기반 추천 결과입니다.",
        matchedSignals,
        alternatives
      },
      autocompleteKeywords: keywords
    };
  } catch {
    return null;
  }
}

function mergeAlternatives(
  ruleResult: RuleRecommendationResponse,
  aiResult: AiRecommendationResponse
) {
  return Array.from(
    new Map(
      [
        ...aiResult.recommendation.alternatives,
        ...ruleResult.recommendation.alternatives,
        {
          category: ruleResult.recommendation.category,
          score: ruleResult.recommendation.confidence
        }
      ]
        .filter((item) => item.category !== aiResult.recommendation.category)
        .map((item) => [`${item.category}`, item])
    ).values()
  ).slice(0, 3);
}

function mergeRecommendations(
  ruleResult: RuleRecommendationResponse,
  aiResult: AiRecommendationResponse
) {
  const sameCategory =
    ruleResult.recommendation.category === aiResult.recommendation.category;
  const strongRule = ruleResult.recommendation.confidence >= 85;
  const weakAi = aiResult.recommendation.confidence < 70;

  if (!sameCategory && strongRule && weakAi) {
    return ruleResult;
  }

  const mergedKeywords = Array.from(
    new Set([
      ...aiResult.recommendation.keywords,
      ...ruleResult.recommendation.keywords
    ])
  ).slice(0, 6);

  const mergedSignals = Array.from(
    new Set([
      ...aiResult.recommendation.matchedSignals,
      ...ruleResult.recommendation.matchedSignals
    ])
  ).slice(0, 6);

  const baseConfidence = sameCategory
    ? Math.round((aiResult.recommendation.confidence * 0.7) + (ruleResult.recommendation.confidence * 0.3))
    : aiResult.recommendation.confidence;

  const mergedConfidence = Math.max(
    45,
    Math.min(98, baseConfidence + (sameCategory ? 5 : 0))
  );

  const alternatives = mergeAlternatives(ruleResult, aiResult);
  const ruleHint = sameCategory
    ? "룰 기반 신호도 같은 카테고리를 지지했습니다."
    : `룰 기반에서는 ${ruleResult.recommendation.category} 가능성도 높게 봤습니다.`;

  return {
    recommendation: {
      ...aiResult.recommendation,
      keywords: mergedKeywords,
      confidence: mergedConfidence,
      reason: `${aiResult.recommendation.reason} ${ruleHint}`,
      matchedSignals: mergedSignals,
      alternatives
    },
    autocompleteKeywords: mergedKeywords
  };
}

export async function getRecommendation(payload: RecommendPayload, env: AiEnv) {
  const ruleResult = recommendLabel(payload);
  const mode = (env.AI_MODE || "auto").toLowerCase();

  if (mode === "rule") {
    return ruleResult;
  }

  const aiResult = await recommendWithAi(payload, env, ruleResult);

  if (aiResult) {
    return mergeRecommendations(ruleResult, aiResult);
  }

  return ruleResult;
}
