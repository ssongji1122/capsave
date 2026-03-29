'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AnalysisResult, PlaceInfo } from '@scrave/shared';
import { fileToBase64, resizeImageFile } from '@/lib/image-utils';

interface BatchAnalyzeModalProps {
  files: File[];
  onSave: (results: AnalysisResult[], imageUrls: string[]) => void;
  onCancel: () => void;
  isGuest?: boolean;
}

export function BatchAnalyzeModal({ files, onSave, onCancel, isGuest = false }: BatchAnalyzeModalProps) {
  const [status, setStatus] = useState<'uploading' | 'analyzing' | 'done' | 'error'>('uploading');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0); // current file index being processed
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [previews] = useState(() => files.map((f) => URL.createObjectURL(f)));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runBatchAnalysis();
  }, []);

  async function runBatchAnalysis() {
    try {
      // Step 1: Upload or convert images
      setStatus('uploading');
      const uploadedUrls: string[] = [];

      if (isGuest) {
        for (let i = 0; i < files.length; i++) {
          setProgress(i + 1);
          const base64 = await fileToBase64(files[i]);
          uploadedUrls.push(base64);
        }
      } else {
        for (let i = 0; i < files.length; i++) {
          setProgress(i + 1);
          const uploadForm = new FormData();
          uploadForm.append('file', files[i]);
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
          if (!uploadRes.ok) throw new Error('이미지 업로드 실패');
          const { url } = await uploadRes.json();
          uploadedUrls.push(url);
        }
      }
      setImageUrls(uploadedUrls);

      // Step 2: Batch analyze — 클라이언트에서 리사이즈 + base64 변환 후 JSON 전송
      setStatus('analyzing');
      setProgress(0);
      const resizedBlobs = await Promise.all(
        files.map((file) => resizeImageFile(file, 800, 0.6))
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

      setResults(analysisResults);
      setExpandedIdx(0); // auto-expand first result
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setStatus('error');
    }
  }

  const isMerged = results.length === 1 && files.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="통합 분석 결과">
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
            📸 {files.length}장
          </div>
        </div>

        <div className="p-6">
          {/* Loading states */}
          {(status === 'uploading' || status === 'analyzing') && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 animate-bounce">
                {status === 'uploading' ? '📤' : '🤖'}
              </div>
              <p className="text-text-primary font-semibold">
                {status === 'uploading'
                  ? `이미지 업로드 중... (${progress}/${files.length}장)`
                  : 'AI가 통합 분석 중...'}
              </p>
              <p className="text-text-tertiary text-sm mt-1">
                {status === 'uploading'
                  ? `${files.length}장의 이미지를 업로드합니다`
                  : '연결된 내용을 자동으로 합칩니다'}
              </p>
              {/* Progress bar */}
              <div className="mt-4 mx-auto max-w-xs h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: status === 'uploading'
                      ? `${(progress / files.length) * 100}%`
                      : '100%',
                  }}
                />
              </div>
              <p className="text-text-tertiary text-xs mt-2">
                {status === 'uploading'
                  ? `${progress}/${files.length}장 완료`
                  : `${files.length}장 통합 분석 중`}
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">❌</div>
              <p className="text-error font-semibold">분석 실패</p>
              <p className="text-text-tertiary text-sm mt-1">{error}</p>
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-surface-elevated text-text-secondary font-medium">
                  닫기
                </button>
                <button onClick={runBatchAnalysis} className="px-6 py-2.5 rounded-xl bg-primary text-black font-semibold">
                  재시도
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {status === 'done' && results.length > 0 && (
            <>
              {/* Merge indicator */}
              {isMerged && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-ai-surface">
                  <span className="text-sm">🔗</span>
                  <span className="text-xs font-medium text-ai-accent">
                    {files.length}장이 하나의 콘텐츠로 합쳐졌습니다
                  </span>
                </div>
              )}
              {!isMerged && results.length > 1 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-surface-elevated">
                  <span className="text-sm">📋</span>
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
                        {isPlace ? '📍' : '📝'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-text-primary truncate">{result.title}</h3>
                        {!isExpanded && result.summary && (
                          <p className="text-xs text-text-tertiary truncate mt-0.5">{result.summary}</p>
                        )}
                      </div>
                      <span className={`text-text-tertiary text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
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
                  onClick={() => onSave(results, imageUrls)}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors"
                >
                  {results.length === 1 ? '저장하기' : `${results.length}개 모두 저장`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
