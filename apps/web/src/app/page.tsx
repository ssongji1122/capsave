'use client';

import { useState, useCallback } from 'react';
import { useCaptures } from '@/contexts/CapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { SearchBar } from '@/components/captures/SearchBar';
import { UploadZone } from '@/components/upload/UploadZone';
import { AnalyzeModal } from '@/components/upload/AnalyzeModal';
import { CaptureItem, AnalysisResult } from '@capsave/shared';

export default function HomePage() {
  const { captures, isLoading, deleteCapture, searchCaptures, saveCapture } = useCaptures();
  const [displayCaptures, setDisplayCaptures] = useState<CaptureItem[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (query) {
      const results = await searchCaptures(query);
      setDisplayCaptures(results);
    } else {
      setDisplayCaptures(null);
    }
  }, [searchCaptures]);

  const handleSave = async (result: AnalysisResult, imageUrl: string) => {
    await saveCapture(result, imageUrl);
    setSelectedFile(null);
  };

  const shown = displayCaptures ?? captures;
  const placeCount = captures.filter((c) => c.category === 'place').length;
  const textCount = captures.filter((c) => c.category === 'text').length;

  return (
    <div className="pb-20 lg:pb-8">
      {/* Header */}
      <div className="px-5 pt-8 pb-3 lg:pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight lg:hidden">CapSave</h1>
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

      {/* Upload */}
      <div className="px-4 mb-4">
        <UploadZone onImageSelected={setSelectedFile} />
      </div>

      {/* Search */}
      <SearchBar onSearch={handleSearch} />

      {/* List */}
      <CaptureList
        captures={shown}
        isLoading={isLoading}
        onDelete={deleteCapture}
        emptyIcon="📸"
        emptyTitle="캡처를 시작해보세요"
        emptySubtitle={'스크린샷을 업로드하면\nAI가 자동으로 분석해 정리해드립니다'}
      />

      {/* Analyze Modal */}
      {selectedFile && (
        <AnalyzeModal
          file={selectedFile}
          onSave={handleSave}
          onCancel={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
