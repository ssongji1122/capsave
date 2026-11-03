'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Bot, CircleX, FileText, MapPin } from 'lucide-react';
import {
  prepareAnalysisForSave,
  validateAnalysisDraft,
  type AnalysisDraftError,
  type AnalysisResult,
  type PlaceInfo,
} from '@scrave/shared';
import { fileToBase64, resizeImageFile } from '@/lib/image-utils';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';
import {
  analyzeSingleCaptureFile,
  saveSingleCaptureFile,
} from '@/lib/single-capture-flow';
import { AnalysisResultEditor } from './AnalysisResultEditor';

interface AnalyzeModalProps {
  file: File;
  onSave: (result: AnalysisResult, imageUrl: string) => void | Promise<void>;
  onCancel: () => void;
  isGuest?: boolean;
  queueInfo?: { current: number; total: number };
}

export function AnalyzeModal({ file, onSave, onCancel, isGuest = false, queueInfo }: AnalyzeModalProps) {
  const [status, setStatus] = useState<'analyzing' | 'done' | 'error'>('analyzing');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [draft, setDraft] = useState<AnalysisResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftError, setDraftError] = useState<AnalysisDraftError | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [preview] = useState(() => URL.createObjectURL(file));
  const started = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  function handleCancel() {
    if (
      result &&
      draft &&
      JSON.stringify(result) !== JSON.stringify(draft) &&
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
    analyzeImage();
  }, []);

  async function analyzeFile(fileToAnalyze: File): Promise<AnalysisResult> {
    const resizedBlob = await resizeImageFile(fileToAnalyze);
    const resizedB64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(resizedBlob);
    });

    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: resizedB64 }),
    });
    if (!analyzeRes.ok) {
      const errData = await analyzeRes.json().catch(() => null);
      throw new Error(errData?.error || 'AI 분석 실패');
    }
    return analyzeRes.json();
  }

  async function uploadFile(fileToUpload: File): Promise<string> {
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

  async function deleteUploadedFile(path: string): Promise<void> {
    const deleteRes = await fetch('/api/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: [path] }),
    });
    if (!deleteRes.ok) {
      const errData = await deleteRes.json().catch(() => null);
      throw new Error(errData?.error || '이미지 정리 실패');
    }
  }

  async function analyzeImage() {
    try {
      setStatus('analyzing');
      setError('');
      setSaveError('');
      const analyzed = await analyzeSingleCaptureFile({
        file,
        isGuest,
        analyzeImage: analyzeFile,
        getGuestImageUrl: fileToBase64,
      });

      setImageUrl(analyzed.imageUrl);
      setResult(analyzed.result);
      setDraft(analyzed.result);
      setDraftError(null);
      setIsEditing(false);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setStatus('error');
    }
  }

  async function persistResult(value: AnalysisResult, savedImageUrl: string) {
    setIsSaving(true);
    setSaveError('');
    try {
      await saveSingleCaptureFile({file,isGuest,result:value,imageUrl:savedImageUrl,uploadFile,onSave,deleteUploadedFile});
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장하지 못했습니다. 수정한 내용은 그대로 남아 있습니다.');
    } finally { setIsSaving(false); }
  }
  async function handleSaveClick() {
    if (!draft || isSaving) return;
    const validationError = validateAnalysisDraft(draft);
    setDraftError(validationError);
    if (validationError) {
      setIsEditing(true);
      if (validationError.field === 'title') {
        requestAnimationFrame(() => titleInputRef.current?.focus());
      }
      return;
    }
    await persistResult(prepareAnalysisForSave(draft), imageUrl);
  }

  function finishEditing() {
    if (!draft) return;
    const validationError = validateAnalysisDraft(draft);
    setDraftError(validationError);
    if (!validationError) setIsEditing(false);
  }

  function cancelEditing() {
    if (!result || !draft) return;
    if (
      JSON.stringify(result) !== JSON.stringify(draft) &&
      !window.confirm('수정한 내용을 버릴까요?')
    ) {
      return;
    }
    setDraft(result);
    setDraftError(null);
    setIsEditing(false);
  }

  const activeResult = draft ?? result;
  const isPlace = activeResult?.category === 'place';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-review-title"
    >
      <div className="bg-surface rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        <div className="relative w-full h-56 bg-surface-elevated">
          {queueInfo && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-semibold text-white">
              {queueInfo.current} / {queueInfo.total}
            </div>
          )}
          <Image src={preview} alt="분석할 원본 캡처" fill className="object-contain rounded-t-3xl" />
        </div>

        <div className="p-5 sm:p-6">
          {status === 'analyzing' && (
            <div className="text-center py-8" aria-live="polite">
              <Bot size={40} className="text-ai-accent mx-auto mb-4 animate-bounce" aria-hidden="true" />
              <h2 id="analysis-review-title" className="text-text-primary font-semibold">AI가 분석 중...</h2>
              <p className="text-text-tertiary text-sm mt-1">잠시만 기다려주세요</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <CircleX size={40} className="text-error mx-auto mb-4" aria-hidden="true" />
              <h2 id="analysis-review-title" className="text-error font-semibold">분석 실패</h2>
              <p role="alert" className="text-text-tertiary text-sm mt-1">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                <button onClick={handleCancel} className="min-h-11 px-6 rounded-xl bg-surface-elevated text-text-secondary font-medium">
                  닫기
                </button>
                <button onClick={analyzeImage} className="min-h-11 px-6 rounded-xl bg-primary text-white font-semibold">
                  다시 분석
                </button>
              </div>
            </div>
          )}

          {status === 'done' && result && activeResult && (
            <>
              <div className="mb-5">
                <h2 id="analysis-review-title" className="text-xl font-bold text-text-primary">
                  분석 내용을 확인해 주세요
                </h2>
                <p className="text-sm leading-relaxed text-text-secondary mt-2">
                  AI가 읽은 내용입니다. 원본과 다른 부분은 저장 전에 고쳐 주세요.
                </p>
              </div>

              {isEditing ? (
                <>
                  <AnalysisResultEditor
                    value={activeResult}
                    onChange={setDraft}
                    error={draftError}
                    titleInputRef={titleInputRef}
                  />
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button onClick={cancelEditing} className="min-h-11 flex-1 rounded-xl bg-surface-elevated text-text-secondary font-medium">
                      수정 취소
                    </button>
                    <button onClick={finishEditing} className="min-h-11 flex-1 rounded-xl bg-primary text-white font-bold">
                      수정 완료
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`inline-flex min-h-8 items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      isPlace ? 'bg-place-surface text-place-accent' : 'bg-text-surface text-text-accent'
                    }`}>
                      {isPlace ? <MapPin size={13} className="mr-1" aria-hidden="true" /> : <FileText size={13} className="mr-1" aria-hidden="true" />}
                      {isPlace ? `장소 (${activeResult.places.length}개)` : '텍스트'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftError(null);
                        setIsEditing(true);
                        requestAnimationFrame(() => titleInputRef.current?.focus());
                      }}
                      className="min-h-11 shrink-0 px-3 rounded-xl border border-border text-sm font-semibold text-primary"
                    >
                      내용 수정
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-text-primary mt-3">{activeResult.title}</h3>
                  {activeResult.summary && <p className="text-text-secondary text-sm mt-2 leading-relaxed">{activeResult.summary}</p>}

                  {isPlace && activeResult.places.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {activeResult.places.map((place: PlaceInfo, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-place-surface">
                          <p className="font-semibold text-place-accent text-sm">{place.name}</p>
                          {place.date && <p className="text-xs text-text-tertiary mt-0.5">{place.date}</p>}
                          {place.address && <p className="text-xs text-text-tertiary mt-0.5">{place.address}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeResult.extractedText && (
                    <div className="mt-3 rounded-xl bg-surface-elevated p-3">
                      <p className="text-xs font-semibold text-text-secondary">추출한 글</p>
                      <p className="mt-1 whitespace-pre-wrap font-mono text-xs leading-relaxed text-text-primary">{activeResult.extractedText}</p>
                    </div>
                  )}

                  {activeResult.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {activeResult.tags.map((tag, index) => <span key={index} className="text-xs text-text-tertiary">#{tag}</span>)}
                    </div>
                  )}

                  {saveError && (
                    <p role="alert" className="mt-4 rounded-xl border border-error px-3 py-2 text-sm text-error">
                      저장하지 못했습니다. 수정한 내용은 그대로 남아 있습니다. {saveError}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button onClick={handleCancel} className="min-h-11 flex-1 rounded-xl bg-surface-elevated text-text-secondary font-medium hover:bg-border transition-colors">
                      {queueInfo && queueInfo.total > 1 ? '건너뛰기' : '취소'}
                    </button>
                    <button
                      onClick={handleSaveClick}
                      disabled={isSaving}
                      className="min-h-11 flex-1 rounded-xl bg-primary text-white font-bold hover:bg-primary-light transition-colors disabled:opacity-50"
                    >
                      {isSaving ? '저장하고 있습니다.' : queueInfo && queueInfo.current < queueInfo.total ? '확인하고 다음' : '확인하고 저장'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
