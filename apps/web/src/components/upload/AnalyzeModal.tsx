'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AnalysisResult, PlaceInfo } from '@capsave/shared';

interface AnalyzeModalProps {
  file: File;
  onSave: (result: AnalysisResult, imageUrl: string) => void;
  onCancel: () => void;
}

export function AnalyzeModal({ file, onSave, onCancel }: AnalyzeModalProps) {
  const [status, setStatus] = useState<'analyzing' | 'done' | 'error'>('analyzing');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [preview] = useState(() => URL.createObjectURL(file));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    analyzeImage();
  }, []);

  async function analyzeImage() {
    try {
      setStatus('analyzing');

      const uploadForm = new FormData();
      uploadForm.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
      if (!uploadRes.ok) throw new Error('이미지 업로드 실패');
      const { url } = await uploadRes.json();
      setImageUrl(url);

      const analyzeForm = new FormData();
      analyzeForm.append('file', file);
      const analyzeRes = await fetch('/api/analyze', { method: 'POST', body: analyzeForm });
      if (!analyzeRes.ok) throw new Error('AI 분석 실패');
      const analysisResult = await analyzeRes.json();

      setResult(analysisResult);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setStatus('error');
    }
  }

  const isPlace = result?.category === 'place';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
        <div className="relative w-full h-56">
          <Image src={preview} alt="Preview" fill className="object-cover rounded-t-3xl" />
        </div>

        <div className="p-6">
          {status === 'analyzing' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 animate-bounce">🤖</div>
              <p className="text-text-primary font-semibold">AI가 분석 중...</p>
              <p className="text-text-tertiary text-sm mt-1">잠시만 기다려주세요</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">❌</div>
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
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                isPlace ? 'bg-place-surface text-place-accent' : 'bg-text-surface text-text-accent'
              }`}>
                {isPlace ? `📍 장소 (${result.places.length}개)` : '📝 텍스트'}
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
                  취소
                </button>
                <button
                  onClick={() => onSave(result, imageUrl)}
                  className="flex-1 py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors"
                >
                  저장하기
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
