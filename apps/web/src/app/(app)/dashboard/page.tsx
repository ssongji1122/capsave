'use client';

import { useState, useCallback, useMemo } from 'react';
import { useCaptures, MAX_FREE_CAPTURES } from '@/contexts/CapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { UncertainQueue } from '@/components/captures/UncertainQueue';
import { SearchBar } from '@/components/captures/SearchBar';
import { UploadZone } from '@/components/upload/UploadZone';
import { AnalyzeModal } from '@/components/upload/AnalyzeModal';
import { BatchAnalyzeModal } from '@/components/upload/BatchAnalyzeModal';
import { CaptureItem, AnalysisResult } from '@scrave/shared';
import { pairResultsWithImages } from '@/lib/batch-save-mapper';
import { Camera } from 'lucide-react';

const CONFIDENCE_THRESHOLD = 0.5;

export default function HomePage() {
  const { captures, isLoading, hasMore, isLoadingMore, loadMore, deleteCapture, searchCaptures, saveCapture, isFreeLimitReached, freeRemaining, isAuthenticated, isAuthReady } = useCaptures();
  const [displayCaptures, setDisplayCaptures] = useState<CaptureItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query) {
      const results = await searchCaptures(query);
      setDisplayCaptures(results);
    } else {
      setDisplayCaptures(null);
    }
  }, [searchCaptures]);

  const handleSingleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setBatchFiles(null);
  }, []);

  const handleMultipleFiles = useCallback((files: File[]) => {
    setBatchFiles(files);
    setSelectedFile(null);
  }, []);

  const handleSave = async (result: AnalysisResult, imageUrl: string) => {
    await saveCapture(result, imageUrl);
    setSelectedFile(null);
  };

  const handleBatchSave = async (results: AnalysisResult[], imageUrls: string[]) => {
    const pairs = pairResultsWithImages(results, imageUrls);
    for (const { result, imageUrl } of pairs) {
      await saveCapture(result, imageUrl);
    }
    setBatchFiles(null);
  };

  const isSearching = displayCaptures !== null;
  const shown = displayCaptures ?? captures;

  const { uncertain, confident } = useMemo(() => {
    const uncertain: CaptureItem[] = [];
    const confident: CaptureItem[] = [];
    for (const c of shown) {
      if (c.confidence !== null && c.confidence < CONFIDENCE_THRESHOLD) {
        uncertain.push(c);
      } else {
        confident.push(c);
      }
    }
    return { uncertain, confident };
  }, [shown]);

  const placeCount = captures.filter((c) => c.category === 'place').length;
  const textCount = captures.filter((c) => c.category === 'text').length;

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="px-5 pt-8 pb-3 lg:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight lg:hidden">Scrave</h1>
        <p className="text-text-secondary text-sm mt-1 lg:hidden">AI 캡처 오거나이저</p>
      </div>

      {/* Stats */}
      {captures.length > 0 && (
        <div className="flex mx-4 mb-4 p-3 rounded-2xl bg-surface border border-border">
          <div className="flex-1 text-center">
            <div className="text-xl font-extrabold text-primary">{captures.length}</div>
            <div className="text-xs text-text-secondary">전체</div>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <div className="text-xl font-extrabold text-place-accent">{placeCount}</div>
            <div className="text-xs text-text-secondary">장소</div>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <div className="text-xl font-extrabold text-text-accent">{textCount}</div>
            <div className="text-xs text-text-secondary">텍스트</div>
          </div>
        </div>
      )}

      {/* Free plan limit bar */}
      <div className="mx-4 mb-3">
        <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5">
          <span>무료 플랜</span>
          <span className={isFreeLimitReached ? 'text-error font-semibold' : ''}>
            {captures.length} / {MAX_FREE_CAPTURES}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isFreeLimitReached ? 'bg-error' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, (captures.length / MAX_FREE_CAPTURES) * 100)}%` }}
          />
        </div>
        {isFreeLimitReached && (
          <p className="text-xs text-error mt-1">한도에 도달했습니다. 더 저장하려면 플랜을 업그레이드하세요.</p>
        )}
      </div>

      {/* Upload */}
      <div className={`px-4 mb-4 ${isFreeLimitReached || !isAuthReady ? 'opacity-50 pointer-events-none' : ''}`}>
        <UploadZone
          onImageSelected={handleSingleFile}
          onMultipleSelected={handleMultipleFiles}
          multiple
        />
      </div>

      {/* Search */}
      <SearchBar onSearch={handleSearch} />

      {/* Uncertain queue */}
      {uncertain.length > 0 && (
        <UncertainQueue
          captures={uncertain}
          onDelete={deleteCapture}
        />
      )}

      {/* List */}
      <CaptureList
        captures={confident}
        isLoading={isLoading}
        onDelete={deleteCapture}
        emptyIcon={<Camera size={40} className="text-primary" />}
        emptyTitle="캡처를 시작해보세요"
        emptySubtitle={'스크린샷을 업로드하면\nAI가 자동으로 분석해 정리해드립니다'}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadMore={loadMore}
        searchQuery={searchQuery}
      />

      {/* Single file analyze modal */}
      {selectedFile && (
        <AnalyzeModal
          file={selectedFile}
          onSave={handleSave}
          onCancel={() => setSelectedFile(null)}
          isGuest={!isAuthenticated}
        />
      )}

      {/* Batch analyze modal — multiple files */}
      {batchFiles && batchFiles.length > 0 && (
        <BatchAnalyzeModal
          files={batchFiles}
          onSave={handleBatchSave}
          onCancel={() => setBatchFiles(null)}
          isGuest={!isAuthenticated}
        />
      )}
    </div>
  );
}
