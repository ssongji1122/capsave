'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Bot, CircleX, FileText, MapPin } from 'lucide-react';
import { AnalysisResult, PlaceInfo } from '@scrave/shared';
import { fileToBase64, resizeImageFile } from '@/lib/image-utils';
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap';
import {
  analyzeSingleCaptureFile,
  saveSingleCaptureFile,
} from '@/lib/single-capture-flow';

interface AnalyzeModalProps {
  file: File;
  onSave: (result: AnalysisResult, imageUrl: string) => void | Promise<void>;
  onCancel: () => void;
  isGuest?: boolean;
  queueInfo?: { current: number; total: number };
}

export function AnalyzeModal({ file, onSave, onCancel, isGuest = false, queueInfo }: AnalyzeModalProps) {
  const containerRef = useModalFocusTrap(true, onCancel);
  const [status, setStatus] = useState<'analyzing' | 'done' | 'error'>('analyzing');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [preview] = useState(() => URL.createObjectURL(file));
  const started = useRef(false);

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
      const analyzed = await analyzeSingleCaptureFile({
        file,
        isGuest,
        analyzeImage: analyzeFile,
        getGuestImageUrl: fileToBase64,
      });

      setImageUrl(analyzed.imageUrl);
      setResult(analyzed.result);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setStatus('error');
    }
  }

  async function handleSaveClick() {
    if (!result || isSaving) return;

    setIsSaving(true);
    try {
      await saveSingleCaptureFile({
        file,
        isGuest,
        result,
        imageUrl,
        uploadFile,
        onSave,
        deleteUploadedFile,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다');
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  const isPlace = result?.category === 'place';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI 분석 결과"
    >
      <div className="bg-surface rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        <div className="relative w-full h-56">
          {queueInfo && (
            <div className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-semibold text-text-primary">
              {queueInfo.current} / {queueInfo.total}
            </div>
          )}
          <Image src={preview} alt="Preview" fill className="object-cover rounded-t-3xl" />
        </div>

        <div className="p-6">
          {status === 'analyzing' && (
            <div className="text-center py-8">
              <Bot size={40} className="text-ai-accent mx-auto mb-4 animate-bounce" aria-hidden="true" />
              <p className="text-text-primary font-semibold">AI가 분석 중...</p>
              <p className="text-text-tertiary text-sm mt-1">잠시만 기다려주세요</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <CircleX size={40} className="text-error mx-auto mb-4" aria-hidden="true" />
              <p className="text-error font-semibold">분석 실패</p>
              <p className="text-text-tertiary text-sm mt-1">{error}</p>
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={onCancel} className="px-6 py-2.5 rounded-xl bg-surface-elevated text-text-secondary font-medium">
                  닫기
                </button>
                <button onClick={analyzeImage} className="px-6 py-2.5 rounded-xl bg-primary text-black font-semibold">
                  재시도
                </button>
              </div>
            </div>
          )}

          {status === 'done' && result && (
            <>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                isPlace ? 'bg-place-surface text-place-accent' : 'bg-text-surface text-text-accent'
              }`}>
                {isPlace ? (
                  <>
                    <MapPin size={13} className="mr-1" aria-hidden="true" />
                    장소 ({result.places.length}개)
                  </>
                ) : (
                  <>
                    <FileText size={13} className="mr-1" aria-hidden="true" />
                    텍스트
                  </>
                )}
              </div>

              <h2 className="text-xl font-bold text-text-primary">{result.title}</h2>
              {result.summary && (
                <p className="text-text-secondary text-sm mt-2 leading-relaxed">{result.summary}</p>
              )}

              {/* Places list */}
              {isPlace && result.places.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {result.places.map((place: PlaceInfo, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-place-surface">
                      <p className="font-semibold text-place-accent text-sm">{place.name}</p>
                      {place.date && <p className="text-xs text-text-tertiary mt-0.5">{place.date}</p>}
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

              <div className="flex gap-3 mt-6">
                <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-surface-elevated text-text-secondary font-medium hover:bg-border transition-colors">
                  {queueInfo && queueInfo.total > 1 ? '건너뛰기' : '취소'}
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors"
                >
                  {isSaving ? '저장 중...' : queueInfo && queueInfo.current < queueInfo.total ? '저장 → 다음' : '저장하기'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
