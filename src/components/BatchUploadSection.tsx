import { useEffect, useMemo, useRef, useState } from "react";
import { fetchRecommendation, fetchValidation } from "../api/labelingApi";
import { categories } from "../lib/categories";
import { cleanProductDescription } from "../lib/descriptionCleaner";
import { downloadSampleBatchCsv } from "../lib/sampleBatchData";
import { parseTabularText } from "../lib/tabularImport";
import { useLabelingStore } from "../store/useLabelingStore";
import type { Recommendation, ValidationResult } from "../types/labeling";

interface BatchRow {
  id: string;
  name: string;
  rawDescription: string;
  cleanedDescription: string;
  recommendation: Recommendation | null;
  selectedCategory: string;
  validation: ValidationResult;
}

interface BatchProgress {
  mode: "idle" | "file" | "recommend" | "validate";
  current: number;
  total: number;
  label: string;
}

const idleValidation: ValidationResult = {
  status: "idle",
  message: "아직 검증 전입니다."
};

const idleProgress: BatchProgress = {
  mode: "idle",
  current: 0,
  total: 0,
  label: ""
};

function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function StatusLegendItem({
  colorClass,
  label
}: {
  colorClass: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-slate-600">
      <span className={`h-3 w-3 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}

function ValidationIndicator({ status }: { status: ValidationResult["status"] }) {
  const colorClass =
    status === "matched"
      ? "bg-teal"
      : status === "mismatched"
        ? "bg-coral"
        : "bg-slate-300";

  const label =
    status === "matched" ? "적절함" : status === "mismatched" ? "불일치" : "대기 중";

  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white"
    >
      <span className={`h-3.5 w-3.5 rounded-full ${colorClass}`} />
    </span>
  );
}

function getProgressText(progress: BatchProgress) {
  if (progress.mode === "file") {
    return `파일 읽는 중 ${progress.current} / ${progress.total}`;
  }

  if (progress.mode === "recommend") {
    return `추천 처리 중 ${progress.current} / ${progress.total}`;
  }

  if (progress.mode === "validate") {
    return `검증 처리 중 ${progress.current} / ${progress.total}`;
  }

  return "";
}

export function BatchUploadSection() {
  const setWorkflowFromBatchRow = useLabelingStore((state) => state.setWorkflowFromBatchRow);
  const bulkRegisterQualityRecords = useLabelingStore(
    (state) => state.bulkRegisterQualityRecords
  );
  const cancelRequestedRef = useRef(false);

  const [rows, setRows] = useState<BatchRow[]>([]);
  const [selectedRowId, setSelectedRowId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "idle" | "matched" | "mismatched"
  >("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>(idleProgress);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isProcessing = isLoadingFile || isRecommending || isValidating;
  const canCancel = isRecommending || isValidating;

  const bulkRegisterTargetCount = rows.filter(
    (row) =>
      row.recommendation &&
      row.selectedCategory &&
      row.validation.status !== "idle"
  ).length;

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsLoadingFile(true);
    setError("");
    setNotice("");
    setProgress({
      mode: "file",
      current: 1,
      total: 1,
      label: file.name
    });

    try {
      const text = await file.text();
      const parsed = parseTabularText(text).slice(0, 20);
      const batchId = `${Date.now()}`;

      const nextRows = parsed.map((item, index) => ({
        id: `${batchId}-${index}`,
        name: item.name,
        rawDescription: item.description,
        cleanedDescription: cleanProductDescription(item.description),
        recommendation: null,
        selectedCategory: "",
        validation: idleValidation
      }));

      setRows(nextRows);
      setSelectedRowId(nextRows[0]?.id || "");
      setCurrentPage(1);
    } catch {
      setError("파일을 읽지 못했습니다. CSV 또는 TSV 형식인지 확인해 주세요.");
    } finally {
      setIsLoadingFile(false);
      setProgress(idleProgress);
      event.target.value = "";
    }
  }

  function handleCancelProcessing() {
    cancelRequestedRef.current = true;
  }

  async function handleRecommendAll() {
    if (rows.length === 0) {
      setError("먼저 업로드할 파일을 선택해 주세요.");
      return;
    }

    cancelRequestedRef.current = false;
    setIsRecommending(true);
    setError("");
    setNotice("");

    try {
      const nextRows: BatchRow[] = [];

      for (const [index, row] of rows.entries()) {
        if (cancelRequestedRef.current) {
          setError("일괄 추천이 중지되었습니다.");
          break;
        }

        setProgress({
          mode: "recommend",
          current: index + 1,
          total: rows.length,
          label: row.name
        });

        const result = await fetchRecommendation({
          name: row.name,
          description: row.cleanedDescription
        });

        if (cancelRequestedRef.current) {
          setError("일괄 추천이 중지되었습니다.");
          break;
        }

        nextRows.push({
          ...row,
          recommendation: result.recommendation,
          selectedCategory: result.recommendation.category,
          validation: {
            status: "idle",
            message: "추천이 완료되었습니다. 필요하면 사용자 카테고리를 수정한 뒤 검증해 주세요."
          }
        });
      }

      if (nextRows.length > 0) {
        const remainder = rows.slice(nextRows.length);
        setRows([...nextRows, ...remainder]);
      }
    } catch {
      setError("일괄 추천 중 오류가 발생했습니다.");
    } finally {
      cancelRequestedRef.current = false;
      setIsRecommending(false);
      setProgress(idleProgress);
    }
  }

  async function handleValidateAll() {
    if (rows.length === 0) {
      setError("검증할 목록이 없습니다.");
      return;
    }

    cancelRequestedRef.current = false;
    setIsValidating(true);
    setError("");
    setNotice("");

    try {
      const nextRows: BatchRow[] = [];

      for (const [index, row] of rows.entries()) {
        if (cancelRequestedRef.current) {
          setError("일괄 검증이 중지되었습니다.");
          break;
        }

        setProgress({
          mode: "validate",
          current: index + 1,
          total: rows.length,
          label: row.name
        });

        if (!row.recommendation || !row.selectedCategory) {
          nextRows.push({
            ...row,
            validation: {
              status: "idle",
              message: "추천 또는 사용자 선택이 없어 검증할 수 없습니다."
            }
          });
          continue;
        }

        const result = await fetchValidation({
          recommendation: row.recommendation,
          selectedCategory: row.selectedCategory
        });

        if (cancelRequestedRef.current) {
          setError("일괄 검증이 중지되었습니다.");
          break;
        }

        nextRows.push({
          ...row,
          validation: result
        });
      }

      if (nextRows.length > 0) {
        const remainder = rows.slice(nextRows.length);
        setRows([...nextRows, ...remainder]);
      }
    } catch {
      setError("일괄 검증 중 오류가 발생했습니다.");
    } finally {
      cancelRequestedRef.current = false;
      setIsValidating(false);
      setProgress(idleProgress);
    }
  }

  function handleBulkRegisterTracking() {
    const registeredCount = bulkRegisterQualityRecords(
      rows
        .filter(
          (row) =>
            row.recommendation &&
            row.selectedCategory &&
            row.validation.status !== "idle"
        )
        .map((row) => ({
          productName: row.name,
          rawDescription: row.rawDescription,
          recommendation: row.recommendation as Recommendation,
          selectedCategory: row.selectedCategory,
          validation: row.validation
        }))
    );

    if (registeredCount > 0) {
      setError("");
      setNotice(`${registeredCount}건을 품질 추적에 일괄 등록했습니다.`);
      return;
    }

    setNotice("");
    setError("일괄 등록할 검증 완료 항목이 없습니다.");
  }

  function updateSelectedCategory(id: string, value: string) {
    setNotice("");
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              selectedCategory: value,
              validation: {
                status: "idle",
                message: "사용자 선택이 변경되었습니다. 다시 검증해 주세요."
              }
            }
          : row
      )
    );
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch = row.name
        .toLocaleLowerCase()
        .includes(searchQuery.trim().toLocaleLowerCase());
      const matchesStatus =
        statusFilter === "all" ? true : row.validation.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const selectedRow = rows.find((row) => row.id === selectedRowId) || filteredRows[0] || null;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedRowId("");
      return;
    }

    if (!filteredRows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(filteredRows[0].id);
    }
  }, [filteredRows, selectedRowId]);

  useEffect(() => {
    if (!selectedRow) {
      return;
    }

    setWorkflowFromBatchRow({
      input: {
        name: selectedRow.name,
        description: selectedRow.rawDescription
      },
      recommendation: selectedRow.recommendation,
      selectedCategory: selectedRow.selectedCategory,
      validation: selectedRow.validation
    });
  }, [selectedRow, setWorkflowFromBatchRow]);

  return (
    <section
      aria-busy={isProcessing}
      className="rounded-[28px] bg-white/90 p-5 shadow-panel backdrop-blur sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-coral">
            Bulk Input
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">파일 업로드</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            구글 시트나 엑셀에서 내보낸 CSV/TSV 파일을 불러와 여러 상품을 한 번에 추천하고
            검증할 수 있습니다.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={downloadSampleBatchCsv}
            disabled={isProcessing}
            className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-auto sm:py-2.5"
          >
            샘플 다운로드
          </button>
          <label className="w-full rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto sm:py-2.5">
            {isLoadingFile ? "파일 읽는 중" : "파일 선택"}
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              disabled={isProcessing}
              onChange={(event) => void handleFileUpload(event)}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void handleRecommendAll()}
          disabled={rows.length === 0 || isRecommending || isValidating}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm text-slate-700 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-auto sm:py-2.5"
        >
          <LoadingSpinner className={isRecommending ? "text-slate-500" : "hidden"} />
          <span>{isRecommending ? "추천 일괄 실행 중" : "추천 일괄 실행"}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleValidateAll()}
          disabled={rows.length === 0 || isValidating || isRecommending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm text-slate-700 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-auto sm:py-2.5"
        >
          <LoadingSpinner className={isValidating ? "text-slate-500" : "hidden"} />
          <span>{isValidating ? "검증 일괄 실행 중" : "검증 일괄 실행"}</span>
        </button>
        <button
          type="button"
          onClick={handleBulkRegisterTracking}
          disabled={isProcessing || bulkRegisterTargetCount === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-3 text-sm text-slate-700 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:w-auto sm:py-2.5"
        >
          <span>품질 추적 일괄 등록</span>
          <span className="text-xs text-slate-400">({bulkRegisterTargetCount})</span>
        </button>
        {canCancel && (
          <button
            type="button"
            onClick={handleCancelProcessing}
            className="w-full rounded-full border border-coral px-4 py-3 text-sm font-medium text-coral transition hover:bg-coral/5 sm:w-auto sm:py-2.5"
          >
            실행 중지
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-coral/20 bg-coral/5 px-4 py-3 text-sm leading-6 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LoadingSpinner className="text-coral" />
            <div>
              <p className="font-medium text-ink">{getProgressText(progress)}</p>
              <p className="text-slate-500">{progress.label || "처리 대상을 확인 중입니다."}</p>
            </div>
          </div>
          {progress.total > 0 && (
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {progress.current} / {progress.total}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm leading-6 text-slate-600">
        {notice ||
          error ||
          "샘플 다운로드로 형식을 먼저 확인할 수 있습니다. 업로드 후 추천 일괄 실행을 누르면 추천 카테고리가 채워지고, 검증 일괄 실행과 품질 추적 일괄 등록까지 이어서 처리할 수 있습니다."}
      </div>

      <div className="mt-5">
        <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusLegendItem colorClass="bg-teal" label="검증 적절함" />
            <StatusLegendItem colorClass="bg-coral" label="검증 불일치" />
            <StatusLegendItem colorClass="bg-slate-300" label="검증 대기 중" />
          </div>
          <p className="text-xs text-slate-500">
            행을 클릭하면 입력, 추천, 검증, 결과 영역 전체가 같은 상품 기준으로 갱신됩니다.
          </p>
        </div>

        <div className="mb-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_180px_140px]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              상품명 검색
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              disabled={isProcessing}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink outline-none transition focus:border-coral focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder="상품명으로 검색"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              상태 필터
            </span>
            <select
              value={statusFilter}
              disabled={isProcessing}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "all" | "idle" | "matched" | "mismatched"
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink outline-none transition focus:border-coral focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="all">전체 상태</option>
              <option value="idle">대기 중</option>
              <option value="matched">적절함</option>
              <option value="mismatched">불일치</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              리스트 크기
            </span>
            <select
              value={pageSize}
              disabled={isProcessing}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink outline-none transition focus:border-coral focus:bg-white disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={20}>20개</option>
            </select>
          </label>
        </div>

        <div className="mb-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            전체 {rows.length}건 중 {filteredRows.length}건 표시
          </p>
          <p>
            {filteredRows.length > 0
              ? `${currentPage} / ${totalPages} 페이지`
              : "표시할 목록이 없습니다."}
          </p>
        </div>

        <div
          className={`relative w-full cursor-grab overflow-x-auto active:cursor-grabbing ${
            isProcessing ? "opacity-80" : ""
          }`}
        >
          <table className="w-full min-w-full table-fixed border-collapse overflow-hidden rounded-3xl text-sm sm:min-w-[980px]">
            <colgroup>
              <col className="w-[26%] sm:w-[20%]" />
              <col className="w-[18%] sm:w-[10%]" />
              <col className="hidden sm:table-column sm:w-[36%]" />
              <col className="w-[38%] sm:w-[24%]" />
              <col className="w-[18%] sm:w-[10%]" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 text-left sm:px-4">
                  상품명
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-left sm:px-4">
                  추천 카테고리
                </th>
                <th className="hidden border-b border-slate-200 px-4 py-3 text-left sm:table-cell">
                  원본 설명
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-left sm:px-4">
                  사용자 카테고리
                </th>
                <th className="border-b border-slate-200 px-3 py-3 text-left sm:px-4">
                  검증 상태
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => {
                  const isSelected = selectedRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      className={`cursor-pointer align-top transition ${
                        isSelected
                          ? "bg-coral/5 ring-1 ring-inset ring-coral/20"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <td className="border-b border-slate-100 px-3 py-3 text-ink sm:px-4">
                        <div className="font-medium text-ink sm:hidden" title={row.name || "-"}>
                          {row.name ? truncateLabel(row.name, 20) : "-"}
                        </div>
                        <div
                          className="hidden truncate font-medium text-ink sm:block"
                          title={row.name || "-"}
                        >
                          {row.name || "-"}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-ink sm:px-4">
                        {row.recommendation ? row.recommendation.category : "-"}
                      </td>
                      <td className="hidden border-b border-slate-100 px-4 py-3 text-slate-600 sm:table-cell">
                        <div className="line-clamp-2 break-words leading-6" title={row.rawDescription || "-"}>
                          {row.rawDescription || "-"}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 sm:px-4">
                        <select
                          value={row.selectedCategory}
                          disabled={isProcessing}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateSelectedCategory(row.id, event.target.value)}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-ink outline-none transition focus:border-coral disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-40 sm:px-3 sm:text-sm"
                        >
                          <option value="">선택하세요</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 sm:px-4">
                        <ValidationIndicator status={row.validation.status} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="border-b border-slate-100 px-4 py-8 text-center text-slate-500"
                  >
                    {rows.length > 0
                      ? "현재 검색 또는 필터 조건에 맞는 목록이 없습니다."
                      : "업로드한 목록이 없습니다. CSV 또는 TSV 파일을 선택해 주세요."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            {filteredRows.length > 0
              ? `${(currentPage - 1) * pageSize + 1}-${Math.min(
                  currentPage * pageSize,
                  filteredRows.length
                )} / ${filteredRows.length}건`
              : "0건"}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1 || isProcessing}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages || filteredRows.length === 0 || isProcessing}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-coral hover:text-coral disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">선택 행 상세 보기</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              행을 클릭하면 입력, AI 추천, 사용자 선택, 검증 결과가 전체 스텝에 함께 반영됩니다.
            </p>
          </div>
          {selectedRow ? (
            <span className="inline-flex rounded-full bg-coral/10 px-3 py-1 text-xs font-medium text-coral">
              현재 선택: {selectedRow.name}
            </span>
          ) : null}
        </div>

        {selectedRow ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-semibold text-slate-700">원본 설명</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {selectedRow.rawDescription || "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-semibold text-slate-700">정제된 설명</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {selectedRow.cleanedDescription || "-"}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-semibold text-slate-700">추천 상세</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                <p>추천 카테고리: {selectedRow.recommendation?.category || "-"}</p>
                <p>
                  추천 소스:{" "}
                  {selectedRow.recommendation?.source === "llm"
                    ? "OpenAI 추천"
                    : selectedRow.recommendation
                      ? "룰 기반 추천"
                      : "-"}
                </p>
                <p>
                  신뢰도:{" "}
                  {selectedRow.recommendation
                    ? `${selectedRow.recommendation.confidence}%`
                    : "-"}
                </p>
                <p>추천 사유: {selectedRow.recommendation?.reason || "-"}</p>
                <p>사용자 카테고리: {selectedRow.selectedCategory || "-"}</p>
                <p>검증 상태: {selectedRow.validation.message}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4">
              <p className="text-sm font-semibold text-slate-700">추천 근거 키워드</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRow.recommendation?.matchedSignals.length ? (
                  selectedRow.recommendation.matchedSignals.map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                    >
                      {signal}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">아직 추천 근거가 없습니다.</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm leading-6 text-slate-500">
            상세히 볼 항목이 없습니다. 표에서 상품 행을 클릭해 선택해 주세요.
          </div>
        )}
      </div>
    </section>
  );
}
