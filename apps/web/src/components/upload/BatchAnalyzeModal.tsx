'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Bot,
  Camera,
  ChevronDown,
  CircleX,
  ClipboardList,
  FileText,
  Link2,
  MapPin,
} from 'lucide-react';
import {
  prepareAnalysisForSave,
  validateAnalysisDraft,
  type AnalysisDraftError,
  type AnalysisResult,
  type PlaceInfo,
} from '@scrave/shared';
import { createJpegUploadFile, fileToBase64 } from '@/lib/image-utils';
import { prepareBatchAnalysis, batchAnalysisError } from '@/lib/batch-analysis-request';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';
import { getBatchResultImageSourceIndices } from '@/lib/batch-save-mapper';
import {
  BATCH_SAVE_CAPACITY_ERROR_MESSAGE,
  getBatchSaveCapacityState,
} from '@/lib/batch-save-capacity';
import { saveBatchCaptureFiles } from '@/lib/batch-capture-save-flow';
import { AnalysisResultEditor } from './AnalysisResultEditor';

const BATCH_ANALYSIS_ERROR_TITLE = '분석 실패';

interface BatchAnalyzeModalProps {
  files: File[];
  onSave: (results: AnalysisResult[], imageUrls: string[]) => void | Promise<void>;
  onCancel: () => void;
  onCapacityExceeded?: () => void;
  isGuest?: boolean;
  maxSaveCount?: number;
}

export function BatchAnalyzeModal({
  files,
  onSave,
  onCancel,
  onCapacityExceeded,
  isGuest = false,
  maxSaveCount,
}: BatchAnalyzeModalProps) {
  const [status, setStatus] = useState<'analyzing' | 'done' | 'error'>('analyzing');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [originalResults, setOriginalResults] = useState<AnalysisResult[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [errorTitle, setErrorTitle] = useState(BATCH_ANALYSIS_ERROR_TITLE);
  const [canRetryAnalysis, setCanRetryAnalysis] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingBaseline, setEditingBaseline] = useState<AnalysisResult | null>(null);
  const [draftErrors, setDraftErrors] = useState<Record<number, AnalysisDraftError | null>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [previews] = useState(() => files.map((f) => URL.createObjectURL(f)));
  const started = useRef(false);

  function handleCancel() {
    if (
      JSON.stringify(results) !== JSON.stringify(originalResults) &&
      !window.confirm('수정한 내용이 저장되지 않습니다. 닫을까요?')
    ) {
      return;
    }
    onCancel();
  }

  const containerRef = useModalFocusTrap(true, handleCancel);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runBatchAnalysis();
  }, []);

  async function runBatchAnalysis() {
    try {
      setStatus('analyzing');
      setError('');
      setSaveError('');
      setErrorTitle(BATCH_ANALYSIS_ERROR_TITLE);
      setCanRetryAnalysis(true);
      const body = await prepareBatchAnalysis(files);

      const analyzeRes = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!analyzeRes.ok) {
        throw new Error(await batchAnalysisError(analyzeRes));
      }
      const { results: analysisResults } = await analyzeRes.json();

      if (isGuest) {
        const sourceIndices = getBatchResultImageSourceIndices(analysisResults, files.length);
        const guestImageUrls = await Promise.all(
          sourceIndices.map((sourceIndex) => fileToBase64(files[sourceIndex]))
        );
        setImageUrls(guestImageUrls);
      } else {
        setImageUrls([]);
      }

      setResults(analysisResults);
      setOriginalResults(analysisResults);
      setDraftErrors({});
      setEditingIdx(null);
      setEditingBaseline(null);
      setExpandedIdx(0); // auto-expand first result
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setErrorTitle(BATCH_ANALYSIS_ERROR_TITLE);
      setCanRetryAnalysis(true);
      setStatus('error');
    }
  }

  async function uploadFile(file: File): Promise<string> {
    const fileToUpload = await createJpegUploadFile(file);
    const uploadForm = new FormData();
    uploadForm.append('file', fileToUpload);
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => null);
      throw new Error(errData?.error || '이미지 업로드 실패');
    }
    const { path } = await uploadRes.json();
    return path;
  }

  async function uploadImagesForResults(): Promise<string[]> {
    const sourceIndices = getBatchResultImageSourceIndices(results, files.length);
    const uniqueIndices = [...new Set(sourceIndices)];
    const uploadedByIndex = new Map<number, string>();

    await Promise.all(
      uniqueIndices.map(async (sourceIndex) => {
        uploadedByIndex.set(sourceIndex, await uploadFile(files[sourceIndex]));
      })
    );

    return sourceIndices.map((sourceIndex) => {
      const path = uploadedByIndex.get(sourceIndex);
      if (!path) throw new Error('이미지 업로드 결과를 찾을 수 없습니다');
      return path;
    });
  }

  async function deleteUploadedFiles(paths: string[]): Promise<void> {
    const uniquePaths = [...new Set(paths)];
    if (uniquePaths.length === 0) return;

    const deleteRes = await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: uniquePaths }),
    });
    if (!deleteRes.ok) {
      const errData = await deleteRes.json().catch(() => null);
      throw new Error(errData?.error || '이미지 정리 실패');
    }
  }

  async function handleSaveClick() {
    if (isSaving || results.length === 0) return;

    const validationErrors = Object.fromEntries(
      results.map((result, index) => [index, validateAnalysisDraft(result)])
    ) as Record<number, AnalysisDraftError | null>;
    setDraftErrors(validationErrors);
    const invalidIndex = results.findIndex((_, index) => validationErrors[index] !== null);
    if (invalidIndex >= 0) {
      setExpandedIdx(invalidIndex);
      setEditingIdx(invalidIndex);
      setEditingBaseline(results[invalidIndex]);
      return;
    }

    const preparedResults = results.map(prepareAnalysisForSave);

    setIsSaving(true);
    setSaveError('');
    try {
      const capacity = getBatchSaveCapacityState({
        resultCount: preparedResults.length,
        maxSaveCount,
      });
      if (!capacity.canSave) {
        setSaveError(BATCH_SAVE_CAPACITY_ERROR_MESSAGE);
        onCapacityExceeded?.();
        return;
      }

      const urls = await saveBatchCaptureFiles({
        isGuest,
        results: preparedResults,
        guestImageUrls: imageUrls,
        uploadFilesForResults: uploadImagesForResults,
        deleteUploadedFiles,
        onSave,
      });
      setImageUrls(urls);
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다';
      setSaveError(`수정한 내용은 그대로 남아 있습니다. ${message}`);
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(index: number) {
    setExpandedIdx(index);
    setEditingIdx(index);
    setEditingBaseline(results[index]);
    setDraftErrors((current) => ({ ...current, [index]: null }));
  }

  function updateResult(index: number, value: AnalysisResult) {
    setResults((current) => current.map((result, resultIndex) => (
      resultIndex === index ? value : result
    )));
    setDraftErrors((current) => ({ ...current, [index]: null }));
  }

  function finishEditing(index: number) {
    const validationError = validateAnalysisDraft(results[index]);
    setDraftErrors((current) => ({ ...current, [index]: validationError }));
    if (!validationError) {
      setEditingIdx(null);
      setEditingBaseline(null);
    }
  }

  function cancelEditing(index: number) {
    if (editingBaseline) updateResult(index, editingBaseline);
    setEditingIdx(null);
    setEditingBaseline(null);
  }

  const isMerged = results.length === 1 && files.length > 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-analysis-title"
    >
      <div className="bg-surface rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        {/* Image strip — show all uploaded images */}
        <div className="relative w-full h-44 flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {previews.map((src, i) => (
            <div key={i} className="relative flex-shrink-0 h-full" style={{ width: `${100 / Math.min(files.length, 3)}%`, minWidth: '120px' }}>
              <Image
                src={src}
                alt={`스크린샷 ${i + 1}`}
                fill
                className={`object-contain bg-surface-elevated ${i === 0 ? 'rounded-tl-3xl' : ''} ${i === previews.length - 1 ? 'rounded-tr-3xl' : ''}`}
              />
            </div>
          ))}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-semibold text-white">
            <Camera size={13} className="inline mr-1" aria-hidden="true" />
            {files.length}장
          </div>
        </div>

        <div className="p-6">
          {/* Loading states */}
          {status === 'analyzing' && (
            <div className="text-center py-8">
              <Bot size={40} className="text-ai-accent mx-auto mb-4 animate-bounce" aria-hidden="true" />
              <h2 id="batch-analysis-title" className="text-text-primary font-semibold">AI가 통합 분석 중...</h2>
              <p className="text-text-tertiary text-sm mt-1">
                연결된 내용을 자동으로 합칩니다
              </p>
              {/* Progress bar */}
              <div className="mt-4 mx-auto max-w-xs h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 animate-pulse"
                  style={{ width: '100%' }}
                />
              </div>
              <p className="text-text-tertiary text-xs mt-2">{files.length}장 통합 분석 중</p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center py-8">
              <CircleX size={40} className="text-error mx-auto mb-4" aria-hidden="true" />
              <h2 id="batch-analysis-title" className="text-error font-semibold">{errorTitle}</h2>
              <p role="alert" className="text-text-tertiary text-sm mt-1">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                <button onClick={handleCancel} className="min-h-11 px-6 rounded-xl bg-surface-elevated text-text-secondary font-medium">
                  닫기
                </button>
                {canRetryAnalysis && (
                  <button onClick={runBatchAnalysis} className="min-h-11 px-6 rounded-xl bg-primary text-white font-semibold">
                    재시도
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {status === 'done' && results.length > 0 && (
            <>
              <div className="mb-5">
                <h2 id="batch-analysis-title" className="text-xl font-bold text-text-primary">
                  AI가 나눈 결과를 확인해 주세요
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  각 항목을 열어 틀린 내용을 고친 뒤 한 번에 저장합니다.
                </p>
              </div>
              {/* Merge indicator */}
              {isMerged && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-ai-surface">
                  <Link2 size={14} className="text-ai-accent" aria-hidden="true" />
                  <span className="text-xs font-medium text-ai-accent">
                    {files.length}장이 하나의 콘텐츠로 합쳐졌습니다
                  </span>
                </div>
              )}
              {!isMerged && results.length > 1 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-surface-elevated">
                  <ClipboardList size={14} className="text-text-secondary" aria-hidden="true" />
                  <span className="text-xs font-medium text-text-secondary">
                    {results.length}개의 다른 콘텐츠로 분리되었습니다
                  </span>
                </div>
              )}

              {results.map((result, idx) => {
                const isPlace = result.category === 'place';
                const isExpanded = expandedIdx === idx;
                const isEditing = editingIdx === idx;
                return (
                  <article
                    key={idx}
                    className={`w-full text-left rounded-2xl p-4 transition-colors ${
                      isExpanded ? 'bg-surface-elevated' : 'bg-surface/50'
                    } ${idx > 0 ? 'mt-3' : ''}`}
                  >
                    {/* Header — always visible */}
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="flex min-h-11 w-full items-center gap-3 text-left"
                      aria-expanded={isExpanded}
                      aria-label={`${result.title} ${isExpanded ? '접기' : '펼치기'}`}
                    >
                      <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full ${
                        isPlace ? 'bg-place-surface text-place-accent' : 'bg-text-surface text-text-accent'
                      }`}>
                        {isPlace ? (
                          <MapPin size={13} aria-hidden="true" />
                        ) : (
                          <FileText size={13} aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-text-primary truncate">{result.title}</h3>
                        {!isExpanded && result.summary && (
                          <p className="text-xs text-text-tertiary truncate mt-0.5">{result.summary}</p>
                        )}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Details — expanded */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border">
                        {isEditing ? (
                          <>
                            <AnalysisResultEditor
                              value={result}
                              onChange={(value) => updateResult(idx, value)}
                              error={draftErrors[idx] ?? null}
                            />
                            <div className="flex flex-col sm:flex-row gap-3 mt-5">
                              <button type="button" onClick={() => cancelEditing(idx)} className="min-h-11 flex-1 rounded-xl bg-background text-text-secondary font-medium">
                                수정 취소
                              </button>
                              <button type="button" onClick={() => finishEditing(idx)} className="min-h-11 flex-1 rounded-xl bg-primary text-white font-bold">
                                수정 완료
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {result.summary && <p className="text-text-secondary text-sm leading-relaxed">{result.summary}</p>}

                            {isPlace && result.places.length > 0 && (
                              <div className="mt-3 flex flex-col gap-2">
                                {result.places.map((place: PlaceInfo, placeIdx: number) => (
                                  <div key={placeIdx} className="p-3 rounded-xl bg-place-surface">
                                    <p className="font-semibold text-place-accent text-sm">{place.name}</p>
                                    {place.address && <p className="text-xs text-text-tertiary mt-0.5">{place.address}</p>}
                                  </div>
                                ))}
                              </div>
                            )}

                            {result.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {result.tags.map((tag, tagIndex) => <span key={tagIndex} className="text-xs text-text-tertiary">#{tag}</span>)}
                              </div>
                            )}
                            <button type="button" onClick={() => startEditing(idx)} className="min-h-11 mt-4 px-3 rounded-xl border border-border text-sm font-semibold text-primary">
                              내용 수정
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}

              {saveError && (
                <p role="alert" className="mt-4 rounded-xl border border-error px-3 py-2 text-sm text-error">
                  {saveError}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button onClick={handleCancel} className="min-h-11 flex-1 rounded-xl bg-surface-elevated text-text-secondary font-medium hover:bg-border transition-colors">
                  취소
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="min-h-11 flex-1 rounded-xl bg-primary text-white font-bold hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  {isSaving ? '저장하고 있습니다.' : results.length === 1 ? '확인하고 저장' : `${results.length}개 확인하고 저장`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
