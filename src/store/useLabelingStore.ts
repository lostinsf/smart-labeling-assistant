import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchHealth, fetchRecommendation, fetchValidation } from "../api/labelingApi";
import { getCategoryCode } from "../lib/categoryMeta";
import { cleanProductDescription } from "../lib/descriptionCleaner";
import type {
  HealthResponse,
  ProductInput,
  Recommendation,
  SavedLabelRecord,
  Stats,
  ValidationHistoryItem,
  ValidationResult
} from "../types/labeling";

interface BatchQualityRecordInput {
  productName: string;
  rawDescription: string;
  recommendation: Recommendation;
  selectedCategory: string;
  validation: ValidationResult;
}

interface LabelingState {
  input: ProductInput;
  recommendation: Recommendation | null;
  autocompleteKeywords: string[];
  selectedCategory: string;
  validation: ValidationResult;
  stats: Stats;
  history: ValidationHistoryItem[];
  savedRecords: SavedLabelRecord[];
  nextRecordSequence: number;
  health: HealthResponse | null;
  hasPendingInputChanges: boolean;
  isLoadingRecommendation: boolean;
  isLoadingValidation: boolean;
  error: string;
  setField: (field: keyof ProductInput, value: string) => void;
  setInputDraft: (input: ProductInput) => void;
  setWorkflowFromBatchRow: (payload: {
    input: ProductInput;
    recommendation: Recommendation | null;
    selectedCategory: string;
    validation: ValidationResult;
  }) => void;
  setSelectedCategory: (category: string) => void;
  clearHistory: () => void;
  saveValidatedRecord: () => void;
  bulkRegisterQualityRecords: (records: BatchQualityRecordInput[]) => number;
  loadHealth: () => Promise<void>;
  requestRecommendation: () => Promise<void>;
  validateSelection: (selectedCategoryOverride?: string) => Promise<void>;
}

const initialValidation: ValidationResult = {
  status: "idle",
  message: "아직 검증 전입니다."
};

function buildHistoryItem(record: BatchQualityRecordInput, createdAt: string): ValidationHistoryItem {
  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    productName: record.productName || "이름 없는 상품",
    recommendedCategory: record.recommendation.category,
    selectedCategory: record.selectedCategory,
    status: record.validation.status,
    source: record.recommendation.source,
    createdAt
  };
}

function buildSavedRecord(
  record: BatchQualityRecordInput,
  createdAt: string,
  sequence: number
): SavedLabelRecord {
  return {
    id: `record-${createdAt}-${sequence}`,
    sequence,
    productName: record.productName || "이름 없는 상품",
    rawDescription: record.rawDescription,
    recommendedCategory: record.recommendation.category,
    selectedCategory: record.selectedCategory,
    internalCategoryCode: getCategoryCode(record.selectedCategory),
    validationStatus: record.validation.status,
    recommendationSource: record.recommendation.source,
    createdAt
  };
}

export const useLabelingStore = create<LabelingState>()(
  persist(
    (set, get) => ({
      input: {
        name: "",
        description: ""
      },
      recommendation: null,
      autocompleteKeywords: [],
      selectedCategory: "",
      validation: initialValidation,
      stats: {
        totalChecks: 0,
        matchedChecks: 0
      },
      history: [],
      savedRecords: [],
      nextRecordSequence: 1,
      health: null,
      hasPendingInputChanges: false,
      isLoadingRecommendation: false,
      isLoadingValidation: false,
      error: "",
      setField: (field, value) =>
        set((state) => ({
          input: {
            ...state.input,
            [field]: value
          },
          recommendation: null,
          autocompleteKeywords: [],
          selectedCategory: "",
          validation: initialValidation,
          hasPendingInputChanges: true,
          error: ""
        })),
      setInputDraft: (input) =>
        set({
          input,
          recommendation: null,
          autocompleteKeywords: [],
          selectedCategory: "",
          validation: initialValidation,
          hasPendingInputChanges: true,
          error: ""
        }),
      setWorkflowFromBatchRow: ({ input, recommendation, selectedCategory, validation }) =>
        set({
          input,
          recommendation,
          autocompleteKeywords: recommendation?.keywords || [],
          selectedCategory,
          validation,
          hasPendingInputChanges: false,
          error: ""
        }),
      setSelectedCategory: (category) =>
        set({
          selectedCategory: category,
          validation: {
            status: "idle",
            message: category
              ? "사용자 카테고리가 선택되었습니다. 검증 실행 버튼으로 다음 단계로 넘어가세요."
              : "사용자 카테고리를 선택해주세요."
          },
          error: ""
        }),
      clearHistory: () =>
        set({
          stats: {
            totalChecks: 0,
            matchedChecks: 0
          },
          history: []
        }),
      saveValidatedRecord: () => {
        const { recommendation, selectedCategory, validation, input, savedRecords, nextRecordSequence } =
          get();

        if (!recommendation || !selectedCategory || validation.status === "idle") {
          set({
            error: "검증 결과가 있어야 저장 대기 레코드를 만들 수 있습니다."
          });
          return;
        }

        const createdAt = new Date().toISOString();
        const record = buildSavedRecord(
          {
            productName: input.name,
            rawDescription: input.description,
            recommendation,
            selectedCategory,
            validation
          },
          createdAt,
          nextRecordSequence
        );

        set({
          savedRecords: [record, ...savedRecords].slice(0, 50),
          nextRecordSequence: nextRecordSequence + 1,
          error: ""
        });
      },
      bulkRegisterQualityRecords: (records) => {
        const validRecords = records.filter(
          (record) =>
            record.recommendation &&
            record.selectedCategory &&
            record.validation.status !== "idle"
        );

        if (validRecords.length === 0) {
          set({
            error: "일괄 등록할 검증 완료 행이 없습니다."
          });
          return 0;
        }

        const { savedRecords, history, stats, nextRecordSequence } = get();
        let sequence = nextRecordSequence;
        const now = Date.now();

        const createdSavedRecords = validRecords.map((record, index) => {
          const createdAt = new Date(now + index).toISOString();
          const savedRecord = buildSavedRecord(record, createdAt, sequence);
          sequence += 1;
          return savedRecord;
        });

        const createdHistory = validRecords.map((record, index) =>
          buildHistoryItem(record, new Date(now + index).toISOString())
        );

        const totalChecksToAdd = validRecords.length;
        const matchedChecksToAdd = validRecords.filter(
          (record) => record.validation.status === "matched"
        ).length;

        set({
          savedRecords: [...createdSavedRecords.reverse(), ...savedRecords].slice(0, 50),
          history: [...createdHistory.reverse(), ...history].slice(0, 20),
          stats: {
            totalChecks: stats.totalChecks + totalChecksToAdd,
            matchedChecks: stats.matchedChecks + matchedChecksToAdd
          },
          nextRecordSequence: sequence,
          error: ""
        });

        return validRecords.length;
      },
      loadHealth: async () => {
        try {
          const health = await fetchHealth();
          set({
            health
          });
        } catch {
          set({
            health: null
          });
        }
      },
      requestRecommendation: async () => {
        const { input } = get();
        const keywordSource = `${input.name} ${input.description}`.trim();

        if (!keywordSource) {
          set({
            error: "상품명 또는 설명을 입력해야 추천을 시작할 수 있습니다.",
            recommendation: null,
            autocompleteKeywords: [],
            validation: initialValidation
          });
          return;
        }

        set({
          isLoadingRecommendation: true,
          error: "",
          validation: initialValidation
        });

        try {
          const result = await fetchRecommendation({
            ...input,
            description: cleanProductDescription(input.description)
          });

          set({
            recommendation: result.recommendation,
            autocompleteKeywords: result.autocompleteKeywords,
            selectedCategory: "",
            validation: {
              status: "idle",
              message: "AI 추천이 준비되었습니다. 사용자 카테고리를 선택하고 검증을 실행하세요."
            },
            hasPendingInputChanges: false,
            isLoadingRecommendation: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "추천을 불러오지 못했습니다.",
            isLoadingRecommendation: false
          });
        }
      },
      validateSelection: async (selectedCategoryOverride) => {
        const { recommendation, selectedCategory, stats, input, history } = get();
        const finalSelectedCategory = selectedCategoryOverride || selectedCategory;

        if (!recommendation || !finalSelectedCategory) {
          set({
            validation: {
              status: "idle",
              message: "추천 결과와 사용자 카테고리를 먼저 확인해주세요."
            }
          });
          return;
        }

        set({
          isLoadingValidation: true,
          error: ""
        });

        try {
          const result = await fetchValidation({
            recommendation,
            selectedCategory: finalSelectedCategory
          });

          const historyItem = buildHistoryItem(
            {
              productName: input.name,
              rawDescription: input.description,
              recommendation,
              selectedCategory: finalSelectedCategory,
              validation: result
            },
            new Date().toISOString()
          );

          set({
            validation: result,
            stats: {
              totalChecks: stats.totalChecks + 1,
              matchedChecks:
                stats.matchedChecks + (result.status === "matched" ? 1 : 0)
            },
            history: [historyItem, ...history].slice(0, 20),
            isLoadingValidation: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "검증에 실패했습니다.",
            isLoadingValidation: false
          });
        }
      }
    }),
    {
      name: "smart-labeling-assistant-store",
      partialize: (state) => ({
        stats: state.stats,
        history: state.history,
        savedRecords: state.savedRecords,
        nextRecordSequence: state.nextRecordSequence
      })
    }
  )
);
