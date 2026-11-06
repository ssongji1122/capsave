import type { CaptureSearchEvidence } from '@/lib/archive-search';

const VISIBLE_EVIDENCE_COUNT = 2;

export function SearchEvidence({ evidence }: { evidence: CaptureSearchEvidence[] }) {
  if (!evidence.length) return null;
  const rows = (items: CaptureSearchEvidence[]) => items.map((item, index) => (
    <p key={`${item.label}:${index}`} className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:keep-all]">
      <span className="font-medium">{item.label}에서 찾음: </span>{item.excerpt}
    </p>
  ));
  return <div role="note" aria-label="검색 근거" className="mt-2 text-sm leading-5 text-text-secondary">
    {rows(evidence.slice(0, VISIBLE_EVIDENCE_COUNT))}
    {evidence.length > VISIBLE_EVIDENCE_COUNT && <details>
      <summary className="min-h-11 cursor-pointer py-3 text-primary">검색 근거 {evidence.length - VISIBLE_EVIDENCE_COUNT}개 더 보기</summary>
      {rows(evidence.slice(VISIBLE_EVIDENCE_COUNT))}
    </details>}
  </div>;
}
