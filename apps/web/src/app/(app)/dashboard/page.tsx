'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCaptures, MAX_FREE_CAPTURES } from '@/contexts/CapturesContext';
import { useGuestCaptures } from '@/contexts/GuestCapturesContext';
import { CaptureList } from '@/components/captures/CaptureList';
import { UncertainQueue } from '@/components/captures/UncertainQueue';
import { SearchBar } from '@/components/captures/SearchBar';
import { UploadZone } from '@/components/upload/UploadZone';
import { AnalyzeModal } from '@/components/upload/AnalyzeModal';
import { BatchAnalyzeModal } from '@/components/upload/BatchAnalyzeModal';
import { CaptureItem, AnalysisResult, CaptureCategory, PlaceInfo, extractStoragePath } from '@scrave/shared';
import { filterCapturesByArchiveQuery, mergeArchiveCaptures } from '@/lib/archive-search';
import { getVisibleArchiveCaptures, SAMPLE_CAPTURES } from '@/lib/sample-captures';
import { findUnusedImagePaths } from '@/lib/batch-save-mapper';
import { createClient } from '@/lib/supabase/browser';
import {
  filterCapturesByLens,
  getCaptureMeta,
  type ArchiveLens,
  type CaptureUserMeta,
} from '@/lib/capture-intent';
import { Bookmark, Camera, CheckCircle2, Compass, Layers } from 'lucide-react';

import { ARCHIVE_SECTIONS, classifyArchiveCapture, type ArchiveSection } from '@scrave/shared';
import { ArchiveSections } from '@/components/captures/ArchiveSections';
import editorial from '@/components/captures/EditorialArchive.module.css';

const CONFIDENCE_THRESHOLD = 0.5;

const LENS_TABS: {
  id: ArchiveLens;
  label: string;
  description: string;
  icon: typeof Layers;
}[] = [
  { id: 'all', label: '전체', description: '모든 캡처 보관함', icon: Layers },
  {
    id: 'travel-pack',
    label: '여행·예약 묶음',
    description: '공항·현장에서 바로 꺼내 보는 예약·일정·장소 원본',
    icon: Bookmark,
  },
  {
    id: 'action-pending',
    label: '할 일·행동',
    description: '전화·예약번호·일정·주소 등 미완료 후속 행동',
    icon: CheckCircle2,
  },
  {
    id: 'rediscover',
    label: '다시 발견·취향',
    description: '작업 시작할 때 또는 저장 이유·메모를 남긴 레퍼런스',
    icon: Compass,
  },
];

export default function HomePage() {
  const { captures, isLoading, hasMore, isLoadingMore, loadMore, deleteCapture, searchCaptures, reclassifyCapture, saveCapture, isFreeLimitReached, freeRemaining, isAuthenticated, isAuthReady } = useCaptures();
  const {
    guestCaptures,
    remainingSlots,
    isGuestFull,
    addCapture: addGuestCapture,
    deleteCapture: deleteGuestCapture,
    reclassifyCapture: reclassifyGuestCapture,
  } = useGuestCaptures();
  const [displayCaptures, setDisplayCaptures] = useState<CaptureItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [archiveSection, setArchiveSection] = useState<ArchiveSection | 'all'>('all');
  const [activeLens, setActiveLens] = useState<ArchiveLens>('all');
  const [metaMap, setMetaMap] = useState<Record<number, CaptureUserMeta>>({});

  const archiveCaptures = useMemo(
    () => mergeArchiveCaptures(captures, guestCaptures),
    [captures, guestCaptures],
  );
  const visibleArchiveCaptures = useMemo(
    () => getVisibleArchiveCaptures(archiveCaptures),
    [archiveCaptures],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextMap: Record<number, CaptureUserMeta> = {};
    for (const item of visibleArchiveCaptures) {
      nextMap[item.id] = getCaptureMeta(window.localStorage, item.id);
    }
    setMetaMap(nextMap);
  }, [visibleArchiveCaptures]);

  const handleMetaChange = useCallback((captureId: number, meta: CaptureUserMeta) => {
    setMetaMap((prev) => ({ ...prev, [captureId]: meta }));
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query) {
      const sampleResults = archiveCaptures.length === 0
        ? filterCapturesByArchiveQuery(SAMPLE_CAPTURES, query)
        : [];
      const guestResults = filterCapturesByArchiveQuery(guestCaptures, query);
      const dbResults = isAuthenticated ? await searchCaptures(query) : [];
      const results = mergeArchiveCaptures([...dbResults, ...sampleResults], guestResults);
      setDisplayCaptures(results);
    } else {
      setDisplayCaptures(null);
    }
  }, [archiveCaptures.length, guestCaptures, isAuthenticated, searchCaptures]);

  const handleSingleFile = useCallback((file: File) => {
    setSelectedFile(file);
    setBatchFiles(null);
  }, []);

  const handleMultipleFiles = useCallback((files: File[]) => {
    setBatchFiles(files);
    setSelectedFile(null);
  }, []);

  const handleSave = async (result: AnalysisResult, imageUrl: string) => {
    if (isAuthenticated) {
      await saveCapture(result, imageUrl);
    } else {
      await addGuestCapture(result, imageUrl);
    }
    setSelectedFile(null);
  };

  const handleBatchSave = async (results: AnalysisResult[], imageUrls: string[]) => {
    for (let i = 0; i < results.length; i++) {
      const imageUrl = imageUrls[i];
      if (!imageUrl) throw new Error('BATCH_IMAGE_URL_MISSING');
      if (isAuthenticated) {
        await saveCapture(results[i], imageUrl);
      } else {
        await addGuestCapture(results[i], imageUrl);
      }
    }

    // Best-effort cleanup of images that AI merged away (no result references them).
    // Guests upload base64 data URLs, not storage paths — skip cleanup in that case.
    if (isAuthenticated) {
      const orphans = findUnusedImagePaths(results, imageUrls)
        .map((url) => extractStoragePath(url))
        .filter((path) => path && !path.startsWith('data:'));
      if (orphans.length > 0) {
        const supabase = createClient();
        await supabase.storage.from('captures').remove(orphans).catch((err: unknown) => {
          console.warn('[batch-save] orphan cleanup failed:', err);
        });
      }
    }

    setBatchFiles(null);
  };

  const handleDelete = useCallback(async (id: number) => {
    if (id < 0) {
      deleteGuestCapture(id);
      setDisplayCaptures((prev) => prev ? prev.filter((capture) => capture.id !== id) : prev);
      return;
    }
    const deleted = await deleteCapture(id);
    if (!deleted) return;
    setDisplayCaptures((prev) => prev ? prev.filter((capture) => capture.id !== id) : prev);
  }, [deleteCapture, deleteGuestCapture]);

  const handleReclassify = useCallback(async (
    id: number,
    category: CaptureCategory,
    places: PlaceInfo[] | null
  ) => {
    if (id < 0) {
      const updated = reclassifyGuestCapture(id, category, places ?? []);
      if (!updated) return;
      setDisplayCaptures((prev) => (
        prev ? prev.map((capture) => (capture.id === updated.id ? updated : capture)) : prev
      ));
      return;
    }
    const updated = await reclassifyCapture(id, category, places);
    if (!updated) return;
    setDisplayCaptures((prev) => (
      prev ? prev.map((capture) => (capture.id === updated.id ? updated : capture)) : prev
    ));
  }, [reclassifyCapture, reclassifyGuestCapture]);

  const handleCleanupOldest = useCallback(async () => {
    const count = Math.min(5, captures.length);
    if (count === 0 || isCleaningUp) return;
    const oldest = [...captures]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, count);
    const confirmed = window.confirm(
      `가장 오래된 캡처 ${count}개를 삭제합니다. 되돌릴 수 없습니다.\n\n` +
        oldest.map((c, i) => `${i + 1}. ${c.title}`).join('\n')
    );
    if (!confirmed) return;
    setIsCleaningUp(true);
    try {
      for (const c of oldest) {
        await deleteCapture(c.id);
      }
    } finally {
      setIsCleaningUp(false);
    }
  }, [captures, deleteCapture, isCleaningUp]);

  const isSearching = displayCaptures !== null;
  const baseShown = displayCaptures ?? visibleArchiveCaptures;
  const shown = useMemo(
    () => filterCapturesByLens(baseShown, metaMap, activeLens).filter(item => archiveSection === 'all' || classifyArchiveCapture(item) === archiveSection),
    [baseShown, metaMap, activeLens, archiveSection],
  );

  const lensCounts = useMemo(
    () => ({
      all: baseShown.length,
      'travel-pack': filterCapturesByLens(baseShown, metaMap, 'travel-pack').length,
      'action-pending': filterCapturesByLens(baseShown, metaMap, 'action-pending').length,
      rediscover: filterCapturesByLens(baseShown, metaMap, 'rediscover').length,
    }),
    [baseShown, metaMap],
  );

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

  const shownLimitCount = isAuthenticated ? captures.length : guestCaptures.length;
  const shownMaxCount = isAuthenticated ? MAX_FREE_CAPTURES : 3;
  const shownRemaining = isAuthenticated ? freeRemaining : remainingSlots;
  const isUploadBlocked = isAuthenticated ? isFreeLimitReached : isGuestFull;
  const activeLensMeta = LENS_TABS.find((t) => t.id === activeLens);

  return (
    <div className={`${editorial.archive} pb-20 lg:pb-8`}>
      {/* Header */}
      <div className="px-5 pt-8 pb-3 lg:pt-10">
        <p className={editorial.eyebrow}>scrave</p>
        <h1>my craves</h1>
        <p className="text-text-secondary text-sm mt-4">scrap, save your crave</p>
      </div>

      <ArchiveSections value={archiveSection} onChange={setArchiveSection} counts={{ all: baseShown.length, ...Object.fromEntries(ARCHIVE_SECTIONS.map(section => [section.id, baseShown.filter(item => classifyArchiveCapture(item) === section.id).length])) } as Record<ArchiveSection | 'all', number>} />
      {/* Free plan limit bar */}
      <div className="mx-4 mb-3">
        <div className="flex items-center justify-between text-xs text-text-tertiary mb-1.5">
          <span>무료 플랜</span>
          <span className={isUploadBlocked ? 'text-error font-semibold' : ''}>
            {shownLimitCount} / {shownMaxCount}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isUploadBlocked ? 'bg-error' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, (shownLimitCount / shownMaxCount) * 100)}%` }}
          />
        </div>
        {isFreeLimitReached && (
          <p className="text-xs text-error mt-1">한도에 도달했습니다. 오래된 캡처를 정리하거나 플랜을 업그레이드하세요.</p>
        )}
        {!isAuthenticated && isGuestFull && (
          <p className="text-xs text-error mt-1">한도에 도달했습니다. 로그인하면 계속 저장할 수 있습니다.</p>
        )}
        {!isSearching && freeRemaining > 0 && freeRemaining <= 20 && captures.length >= 5 && (
          <button
            onClick={handleCleanupOldest}
            disabled={isCleaningUp}
            className="mt-2 w-full text-left px-3 py-2 rounded-lg bg-surface border border-border text-xs text-text-secondary hover:border-primary/40 hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            {isCleaningUp
              ? '오래된 캡처 정리 중…'
              : `${freeRemaining}개 남았습니다. 가장 오래된 ${Math.min(5, captures.length)}개를 정리하기 →`}
          </button>
        )}
      </div>

      {/* Upload */}
      <div data-archive-upload className={`px-4 mb-4 ${isUploadBlocked || !isAuthReady ? 'opacity-50 pointer-events-none' : ''}`}>
        <UploadZone
          onImageSelected={handleSingleFile}
          onMultipleSelected={handleMultipleFiles}
          multiple
        />
      </div>

      {/* Search */}
      <SearchBar onSearch={handleSearch} />

      {/* Scrave Action & Rediscovery Lens Filter Bar */}
      <div className="px-4 mt-2 mb-1">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="캡처 활용 관점 필터">
          {LENS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeLens === tab.id;
            const count = lensCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveLens(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-primary-border bg-primary-surface text-primary'
                    : 'border-border bg-surface text-text-secondary hover:border-border-light hover:text-text-primary'
                }`}
              >
                <Icon size={13} aria-hidden="true" />
                <span>{tab.label}</span>
                <span className="font-mono text-[10px] opacity-80">{count}</span>
              </button>
            );
          })}
        </div>
        {activeLens !== 'all' && activeLensMeta && (
          <p className="mt-1.5 text-xs text-text-tertiary px-1">
            {activeLensMeta.description}
          </p>
        )}
      </div>

      {/* Uncertain queue */}
      {uncertain.length > 0 && (
        <UncertainQueue
          captures={uncertain}
          onDelete={handleDelete}
          onReclassify={handleReclassify}
        />
      )}

      {/* List */}
      <CaptureList
        captures={confident}
        isLoading={visibleArchiveCaptures.length === 0 && isLoading}
        onDelete={handleDelete}
        onMetaChange={handleMetaChange}
        emptyIcon={<Camera size={40} className="text-primary" />}
        emptyTitle="캡처를 시작해보세요"
        emptySubtitle={'스크린샷을 업로드하면\nAI가 자동으로 분석해 정리해드립니다'}
        hasMore={isAuthenticated ? hasMore : false}
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
          maxSaveCount={shownRemaining}
        />
      )}
    </div>
  );
}
