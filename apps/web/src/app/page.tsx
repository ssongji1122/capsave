'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnalysisResult } from '@scrave/shared';
import { GuestCapturesProvider, useGuestCaptures } from '@/contexts/GuestCapturesContext';
import { UploadZone } from '@/components/upload/UploadZone';
import { AnalyzeModal } from '@/components/upload/AnalyzeModal';
import { BatchAnalyzeModal } from '@/components/upload/BatchAnalyzeModal';
import { CaptureList } from '@/components/captures/CaptureList';
import { Archive, Camera, FileText, ImagePlus, Map, MapPin, Sparkles } from 'lucide-react';

function LandingContent() {
  const { guestCaptures, remainingSlots, isGuestFull, addCapture, deleteCapture } = useGuestCaptures();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'place' | 'text'>('all');

  const filteredCaptures = categoryFilter === 'all'
    ? guestCaptures
    : guestCaptures.filter((c) => c.category === categoryFilter);
  const placeCount = guestCaptures.filter((c) => c.category === 'place').length;
  const textCount = guestCaptures.filter((c) => c.category === 'text').length;
  const usedSlots = guestCaptures.length;
  const trialProgress = Math.min(100, (usedSlots / 3) * 100);
  const activeFilterLabel = categoryFilter === 'all' ? '전체 캡처' : categoryFilter === 'place' ? '장소 캡처' : '텍스트 캡처';
  const filterStats = [
    { key: 'all' as const, label: '전체', value: usedSlots, icon: Archive, tone: 'text-primary', surface: 'bg-primary-surface' },
    { key: 'place' as const, label: '장소', value: placeCount, icon: MapPin, tone: 'text-place-accent', surface: 'bg-place-surface' },
    { key: 'text' as const, label: '텍스트', value: textCount, icon: FileText, tone: 'text-text-accent', surface: 'bg-text-surface' },
  ];

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

  const handleSave = async (result: AnalysisResult, imageBase64: string) => {
    await addCapture(result, imageBase64);
    setSelectedFile(null);
  };

  const handleBatchSave = async (results: AnalysisResult[], imageUrls: string[]) => {
    if (results.length > remainingSlots) {
      setBatchFiles(null);
      setShowSignupPrompt(true);
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const imageUrl = imageUrls[i];
      if (!imageUrl) throw new Error('BATCH_IMAGE_URL_MISSING');
      await addCapture(results[i], imageUrl);
    }
    setBatchFiles(null);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-border bg-primary-surface">
              <ImagePlus size={19} className="text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-primary">Scrave</h1>
              <p className="text-xs text-text-tertiary" style={{ fontFamily: 'var(--font-label)' }}>CAPTURE ARCHIVE</p>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text-primary"
          >
            로그인
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-5 lg:px-6 lg:py-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-primary" style={{ fontFamily: 'var(--font-label)' }}>INBOX</p>
                <h2 className="mt-1 text-2xl font-extrabold leading-tight text-text-primary sm:text-[28px]">
                  스크린샷 아카이브
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-primary-border bg-primary-surface px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles size={13} aria-hidden="true" />
                {isGuestFull ? '체험 한도 도달' : `체험 ${remainingSlots}회 남음`}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <UploadZone
                onImageSelected={handleFileSelected}
                onMultipleSelected={handleMultipleFiles}
                multiple
              />
            </div>
          </div>

          <aside className="rounded-3xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <p className="text-xs font-semibold text-ai-accent" style={{ fontFamily: 'var(--font-label)' }}>TRIAGE</p>
              <h2 className="mt-1 text-xl font-bold text-text-primary">분류 현황</h2>
            </div>
            <div className="divide-y divide-border">
              {filterStats.map(({ key, label, value, icon: Icon, tone, surface }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategoryFilter(key)}
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-elevated ${
                    categoryFilter === key ? 'bg-surface-elevated' : ''
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${surface}`}>
                      <Icon size={18} className={tone} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-text-primary">{label}</span>
                      <span className="block text-xs text-text-tertiary">체험 저장소</span>
                    </span>
                  </span>
                  <span className={`text-2xl font-extrabold ${tone}`}>{value}</span>
                </button>
              ))}
            </div>
            <div className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between text-xs text-text-tertiary">
                <span>무료 체험</span>
                <span>{usedSlots} / 3</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${trialProgress}%` }} />
              </div>
              {isGuestFull && (
                <Link
                  href="/login"
                  className="mt-4 block rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold text-black transition-colors hover:bg-primary-light"
                >
                  로그인하고 계속 저장
                </Link>
              )}
            </div>
          </aside>
        </section>

        {guestCaptures.length > 0 ? (
          <section className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-text-tertiary" style={{ fontFamily: 'var(--font-label)' }}>ARCHIVE</p>
                <h2 className="mt-1 text-xl font-bold text-text-primary">{activeFilterLabel}</h2>
              </div>
              <p className="text-sm text-text-tertiary">{filteredCaptures.length}개 표시 중</p>
            </div>

            <CaptureList
              captures={filteredCaptures}
              isLoading={false}
              onDelete={deleteCapture}
              emptyIcon={
                categoryFilter === 'place'
                  ? <MapPin size={40} className="text-place-accent" />
                  : categoryFilter === 'text'
                  ? <FileText size={40} className="text-text-accent" />
                  : <Camera size={40} className="text-primary" />
              }
              emptyTitle={categoryFilter === 'place' ? '저장된 장소가 없습니다' : '저장된 텍스트가 없습니다'}
              emptySubtitle="다른 분류를 선택하거나 새 캡처를 저장해보세요"
            />
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-place-border bg-place-surface p-5">
              <MapPin size={24} className="text-place-accent" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-text-primary">장소 캡처</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                맛집, 카페, 여행지 캡처가 저장되면 장소 목록과 지도에서 이어집니다.
              </p>
            </div>
            <div className="rounded-3xl border border-text-border bg-text-surface p-5">
              <FileText size={24} className="text-text-accent" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-text-primary">텍스트 캡처</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                링크, 메모, 레시피, 코드 조각은 검색 가능한 텍스트 아카이브로 쌓입니다.
              </p>
            </div>
          </section>
        )}

      {guestCaptures.some((c) => c.category === 'place') && (
        <section className="rounded-3xl border border-border bg-surface p-6 text-center">
          <Map size={28} className="text-place-accent mx-auto mb-2" />
          <p className="text-text-primary font-semibold">지도에서 장소를 한눈에</p>
          <p className="text-text-tertiary text-sm mt-1">저장한 장소를 지도에서 확인해보세요</p>
          <Link
            href="/map"
            className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-light transition-colors"
          >
            지도 보기
          </Link>
        </section>
      )}
      </main>

      {/* Signup prompt modal */}
      {showSignupPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-3xl w-full max-w-sm p-8 text-center border border-border">
            <Sparkles size={40} className="text-primary mx-auto mb-4" aria-hidden="true" />
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
