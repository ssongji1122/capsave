'use client';
import { ArchiveIllustration } from './ArchiveIllustration';
import { useEffect, useState, useRef } from 'react';
import { buildArchiveLinks, buildSourceQuery, safeArchiveUrl, type ArchiveCapture } from '@scrave/shared';
interface Candidate { title: string; url: string }
export function ArchiveSources({ capture, onEnriched }: { capture: ArchiveCapture; onEnriched?: (links: string[]) => void }) {
  const enrichedRef = useRef(onEnriched);
  enrichedRef.current = onEnriched;
  const query = buildSourceQuery(capture);
  const [sources, setSources] = useState<Candidate[]>([]);
  const [status, setStatus] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loginRequired, setLoginRequired] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setSources([]);
    setLoginRequired(false);
    if (!query) { setStatus('검색할 공개 이름이 부족합니다.'); return () => controller.abort(); }
    setStatus('출처 후보를 찾고 있습니다.');
    fetch(capture.id ? '/api/capture-enrich' : '/api/capture-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(capture.id ? { captureId: capture.id, force: attempt > 0 } : { query }), signal: controller.signal })
      .then(async response => {
        if (response.status === 401) { if (!controller.signal.aborted) { setLoginRequired(true); setStatus('로그인하면 출처를 자동으로 찾을 수 있습니다.'); } return; }
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (Array.isArray(data.links)) enrichedRef.current?.(data.links);
        if (data.status === 'matched' || data.status === 'partial' || data.status === 'saved') { setStatus(data.status === 'partial' ? `원본 게시물 링크와 이미지 ${data.imageCount}장을 저장했습니다. 일부 이미지는 다시 찾기가 필요합니다.` : `게시물 이미지 ${data.imageCount}장과 출처·지도 링크를 저장했습니다.`); return; }
        const candidates = Array.isArray(data.results) ? data.results.filter((x: Candidate) => typeof x.title === 'string' && safeArchiveUrl(x.url)) : [];
        setSources(candidates); setStatus(candidates.length ? data.saved ? '출처 후보와 지도 검색 링크를 보관함에 저장했습니다. 원본 일치는 확인 전입니다.' : '웹에서 찾은 후보입니다. 원본과의 일치는 확인 전입니다.' : '일치하는 출처 후보를 찾지 못했습니다.');
      }).catch(() => { if (!controller.signal.aborted) setStatus('자동 검색을 완료하지 못했습니다. 아래 검색 링크를 이용하십시오.'); });
    return () => controller.abort();
  }, [query, capture.id, attempt]);
  return <section aria-label="원본 출처와 후속 링크" onClick={e => e.stopPropagation()} className="mt-6 border-t border-border-light pt-4">
    <div className="flex items-center gap-3"><ArchiveIllustration kind="sources" size={52} /><h4 className="text-lg font-medium">원본·출처와 다음 행동</h4></div>
    <p className="text-xs text-text-secondary my-2">계정·본문으로 원본 게시물을 찾고, 읽을 수 있는 이미지와 지도 검색 링크를 저장합니다. 비공개·검색 미노출 게시물은 찾지 못할 수 있습니다.</p>
    <div className="flex flex-col gap-2">{buildArchiveLinks(capture).map(link => <a className="text-sm text-text-accent min-h-11 py-2" key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</div>
    <p role="status" className="text-xs text-text-secondary my-2">{status}</p>
    {loginRequired && <a href="/login" className="block text-sm underline py-2">로그인하고 출처 찾기</a>}
    {sources.map(source => <a className="block text-sm text-primary py-2" key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">출처 후보 · {source.title}</a>)}
    <button type="button" onClick={() => setAttempt(x => x + 1)} className="min-h-11 text-sm underline underline-offset-4">출처 다시 찾기</button>
  </section>;
}
