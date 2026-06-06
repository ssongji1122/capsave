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
import { AnalysisResult, PlaceInfo } from '@scrave/shared';
import { createJpegUploadFile, fileToBase64, resizeImageFile } from '@/lib/image-utils';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';
import { getBatchResultImageSourceIndices } from '@/lib/batch-save-mapper';
import {
  BATCH_SAVE_CAPACITY_ERROR_MESSAGE,
  getBatchSaveCapacityState,
} from '@/lib/batch-save-capacity';
import { saveBatchCaptureFiles } from '@/lib/batch-capture-save-flow';

const BATCH_ANALYSIS_ERROR_TITLE = '분석 실패';
const BATCH_SAVE_ERROR_TITLE = '저장 실패';
const BATCH_SAVE_BLOCKED_TITLE = '저장할 수 없습니다';

interface BatchAnalyzeModalProps {
  files: File[];
  onSave: (results: AnalysisResult[], imageUrls: string[]) => void | Promise<void>;
  onCancel: () => void;
  isGuest?: boolean;
  maxSaveCount?: number;
}

export function BatchAnalyzeModal({
  files,
  onSave,
  onCancel,
  isGuest = false,
  maxSaveCount,
}: BatchAnalyzeModalProps) {
  const containerRef = useModalFocusTrap(true, onCancel);
  const [status, setStatus] = useState<'analyzing' | 'done' | 'error'>('analyzing');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState(BATCH_ANALYSIS_ERROR_TITLE);
  const [canRetryAnalysis, setCanRetryAnalysis] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previews] = useState(() => files.map((f) => URL.createObjectURL(f)));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runBatchAnalysis();
  }, []);

  async function runBatchAnalysis() {
    try {
      setStatus('analyzing');
      setError('');
      setErrorTitle(BATCH_ANALYSIS_ERROR_TITLE);
      setCanRetryAnalysis(true);
      const resizedBlobs = await Promise.all(
        files.map((file) => resizeImageFile(file))
      );
      // Convert blobs to base64 for JSON transport (avoids FormData size limits)
      const base64Images = await Promise.all(
        resizedBlobs.map((blob) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              // Strip "data:image/jpeg;base64," prefix
              resolve(dataUrl.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        })
      );

      const analyzeRes = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: base64Images }),
      });
      if (!analyzeRes.ok) {
        const errData = await analyzeRes.json().catch(() => null);
        throw new Error(errData?.error || 'AI 통합 분석 실패');
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

    setIsSaving(true);
    try {
      const capacity = getBatchSaveCapacityState({
        resultCount: results.length,
        maxSaveCount,
      });
      if (!capacity.canSave) {
        setError(BATCH_SAVE_CAPACITY_ERROR_MESSAGE);
        setErrorTitle(BATCH_SAVE_BLOCKED_TITLE);
        setCanRetryAnalysis(false);
        setStatus('error');
        return;
      }

      const urls = await saveBatchCaptureFiles({
        isGuest,
        results,
        guestImageUrls: imageUrls,
        uploadFilesForResults: uploadImagesForResults,
        deleteUploadedFiles,
        onSave,
      });
      setImageUrls(urls);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다');
      setErrorTitle(BATCH_SAVE_ERROR_TITLE);
      setCanRetryAnalysis(false);
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  const isMerged = results.length === 1 && files.length > 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="통합 분석 결과"
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
                className={`object-cover ${i === 0 ? 'rounded-tl-3xl' : ''} ${i === previews.length - 1 ? 'rounded-tr-3xl' : ''}`}
              />
            </div>
          ))}
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-semibold text-text-primary">
            <Camera size={13} className="inline mr-1" aria-hidden="true" />
            {files.length}장
          </div>
        </div>

        <div className="p-6">
          {/* Loading states */}
          {status === 'analyzing' && (
            <div className="text-center py-8">
              <Bot size={40} className="text-ai-accent mx-auto mb-4 animate-bounce" aria-hidden="true" />
              <p className="text-text-primary font-semibold">AI가 통합 분석 중...</p>
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
              <p className="text-error font-semibold">{errorTitle}</p>
              <p className="text-text-tertiary text-sm mt-1">{error}</p>
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-surface-elevated text-text-secondary font-medium">
                  닫기
                </button>
                {canRetryAnalysis && (
                  <button onClick={runBatchAnalysis} className="px-6 py-2.5 rounded-xl bg-primary text-black font-semibold">
                    재시도
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {status === 'done' && results.length > 0 && (
            <>
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
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className={`w-full text-left rounded-2xl p-4 transition-colors ${
                      isExpanded ? 'bg-surface-elevated' : 'hover:bg-surface-elevated/50'
                    } ${idx > 0 ? 'mt-3' : ''}`}
                  >
                    {/* Header — always visible */}
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                    </div>

                    {/* Details — expanded */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border">
                        {result.summary && (
                          <p className="text-text-secondary text-sm leading-relaxed">{result.summary}</p>
                        )}

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
                            {result.tags.map((tag, i) => (
                              <span key={i} className="text-xs text-text-tertiary">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}

              <div className="flex gap-3 mt-6">
                <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-surface-elevated text-text-secondary font-medium hover:bg-border transition-colors">
                  취소
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  {isSaving ? '저장 중...' : results.length === 1 ? '저장하기' : `${results.length}개 모두 저장`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
