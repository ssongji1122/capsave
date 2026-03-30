'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnalysisResult } from '@scrave/shared';
import { GuestCapturesProvider, useGuestCaptures } from '@/contexts/GuestCapturesContext';
import { UploadZone } from '@/components/upload/UploadZone';
import { AnalyzeModal } from '@/components/upload/AnalyzeModal';
import { BatchAnalyzeModal } from '@/components/upload/BatchAnalyzeModal';
import { CaptureList } from '@/components/captures/CaptureList';

function LandingContent() {
  const { guestCaptures, remainingSlots, isGuestFull, addCapture, deleteCapture } = useGuestCaptures();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'place' | 'text'>('all');

  const filteredCaptures = categoryFilter === 'all'
    ? guestCaptures
    : guestCaptures.filter((c) => c.category === categoryFilter);

  const handleFileSelected = (file: File) => {
    if (isGuestFull) {
      setShowSignupPrompt(true);
      return;
    }
    setSelectedFile(file);
    setBatchFiles(null);
  };

  const handleMultipleFiles = (files: File[]) => {
    if (isGuestFull) {
      setShowSignupPrompt(true);
      return;
    }
    // 모든 이미지를 분석에 넘김 (합쳐질 수 있으므로 미리 자르지 않음)
    setBatchFiles(files.slice(0, 10)); // API 최대 10장
    setSelectedFile(null);
  };

  const handleSave = (result: AnalysisResult, imageBase64: string) => {
    addCapture(result, imageBase64);
    setSelectedFile(null);
  };

  const handleBatchSave = (results: AnalysisResult[], imageUrls: string[]) => {
    for (let i = 0; i < results.length; i++) {
      const imageUrl = imageUrls[Math.min(i, imageUrls.length - 1)];
      addCapture(results[i], imageUrl);
    }
    setBatchFiles(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-extrabold text-primary">Scrave</h1>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl bg-surface border border-border text-text-secondary text-sm font-medium hover:bg-surface-elevated transition-colors"
        >
          로그인
        </Link>
      </header>

      {/* Hero */}
      <div className="px-5 pt-10 pb-6 text-center">
        <h2 className="text-3xl font-extrabold text-text-primary leading-tight">
          스크린샷을 올려보세요
        </h2>
        <p className="text-text-secondary text-sm mt-2 leading-relaxed">
          AI가 장소와 텍스트를 자동으로 분류합니다
        </p>
      </div>

      {/* Upload */}
      <div className="px-4 mb-2">
        <UploadZone
          onImageSelected={handleFileSelected}
          onMultipleSelected={handleMultipleFiles}
          multiple
        />
      </div>

      {/* Remaining slots */}
      <div className="text-center text-xs text-text-tertiary mb-6">
        {isGuestFull ? (
          <div className="flex items-center justify-center gap-2">
            <span>체험 한도에 도달했습니다</span>
            <Link
              href="/login"
              className="text-primary font-semibold hover:text-primary-light transition-colors"
            >
              로그인하기 →
            </Link>
          </div>
        ) : (
          `무료 체험: ${remainingSlots}회 남음`
        )}
      </div>

      {/* Guest captures list */}
      {guestCaptures.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex mx-0 mb-4 p-3 rounded-2xl bg-surface border border-border">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`flex-1 text-center py-1 rounded-xl transition-colors ${categoryFilter === 'all' ? 'bg-surface-elevated' : ''}`}
            >
              <div className="text-xl font-extrabold text-primary">{guestCaptures.length}</div>
              <div className="text-xs text-text-secondary">체험 캡처</div>
            </button>
            <div className="w-px bg-border" />
            <button
              type="button"
              onClick={() => setCategoryFilter('place')}
              className={`flex-1 text-center py-1 rounded-xl transition-colors ${categoryFilter === 'place' ? 'bg-surface-elevated' : ''}`}
            >
              <div className="text-xl font-extrabold text-place-accent">
                {guestCaptures.filter((c) => c.category === 'place').length}
              </div>
              <div className="text-xs text-text-secondary">장소</div>
            </button>
            <div className="w-px bg-border" />
            <button
              type="button"
              onClick={() => setCategoryFilter('text')}
              className={`flex-1 text-center py-1 rounded-xl transition-colors ${categoryFilter === 'text' ? 'bg-surface-elevated' : ''}`}
            >
              <div className="text-xl font-extrabold text-text-accent">
                {guestCaptures.filter((c) => c.category === 'text').length}
              </div>
              <div className="text-xs text-text-secondary">텍스트</div>
            </button>
          </div>

          <CaptureList
            captures={filteredCaptures}
            isLoading={false}
            onDelete={deleteCapture}
            emptyIcon={categoryFilter === 'place' ? '📍' : categoryFilter === 'text' ? '📝' : '📸'}
            emptyTitle={categoryFilter === 'place' ? '저장된 장소가 없습니다' : categoryFilter === 'text' ? '저장된 텍스트가 없습니다' : ''}
            emptySubtitle={categoryFilter !== 'all' ? '스크린샷을 업로드하면 자동 분류됩니다' : ''}
          />
        </div>
      )}

      {/* Map teaser */}
      {guestCaptures.some((c) => c.category === 'place') && (
        <div className="mx-4 mb-8 p-6 rounded-2xl bg-surface border border-border text-center">
          <div className="text-3xl mb-2">🗺</div>
          <p className="text-text-primary font-semibold">지도에서 장소를 한눈에</p>
          <p className="text-text-tertiary text-sm mt-1">가입하면 저장한 장소를 지도에서 볼 수 있어요</p>
          <Link
            href="/login"
            className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-light transition-colors"
          >
            무료로 시작하기
          </Link>
        </div>
      )}

      {/* CTA for empty state */}
      {guestCaptures.length === 0 && (
        <div className="px-4 pb-8 text-center">
          <div className="p-8 rounded-2xl bg-surface border border-border">
            <div className="text-5xl mb-4">📸</div>
            <p className="text-text-primary font-semibold">캡처를 시작해보세요</p>
            <p className="text-text-tertiary text-sm mt-1 whitespace-pre-line">
              {'스크린샷을 업로드하면\nAI가 자동으로 분석해 정리해드립니다'}
            </p>
          </div>
        </div>
      )}

      {/* Signup prompt modal */}
      {showSignupPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-3xl w-full max-w-sm p-8 text-center border border-border">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-text-primary">캡처 3개를 분석했어요!</h3>
            <p className="text-text-secondary text-sm mt-2 mb-6">
              가입하면 무제한으로 캡처를 저장하고{'\n'}어디서든 접근할 수 있어요
            </p>
            <Link
              href="/login"
              className="block w-full py-3 rounded-xl bg-primary text-black font-bold hover:bg-primary-light transition-colors mb-3"
            >
              무료로 시작하기
            </Link>
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="text-text-tertiary text-sm hover:text-text-secondary transition-colors"
            >
              나중에 할게요
            </button>
          </div>
        </div>
      )}

      {/* Single file analyze modal */}
      {selectedFile && (
        <AnalyzeModal
          file={selectedFile}
          onSave={handleSave}
          onCancel={() => setSelectedFile(null)}
          isGuest
        />
      )}

      {/* Batch analyze modal — multiple files */}
      {batchFiles && batchFiles.length > 0 && (
        <BatchAnalyzeModal
          files={batchFiles}
          onSave={handleBatchSave}
          onCancel={() => setBatchFiles(null)}
          isGuest
        />
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <GuestCapturesProvider>
      <LandingContent />
    </GuestCapturesProvider>
  );
}
