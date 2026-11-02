import { classifyArchiveCapture, type ArchiveSection, type ArchiveCapture } from '../../../packages/shared/src/utils/capture-archive';
import { filterCapturesByLens, getCaptureReasonLabels, EMPTY_CAPTURE_META, type ArchiveLens } from '../../../packages/shared/src/utils/capture-intent';
import type { CaptureMetaMap } from './capture-meta-store';

export const ARCHIVE_LENSES: {id: ArchiveLens; label: string}[] = [
  {id:'all',label:'전체'}, {id:'travel-pack',label:'여행·예약'},
  {id:'action-pending',label:'처리할 일'}, {id:'rediscover',label:'다시 보기'},
];
export function selectArchiveCaptures<T extends ArchiveCapture & {id:number}>(captures: T[], metaMap: CaptureMetaMap,
  {query,lens,section}: {query:string;lens:ArchiveLens;section:ArchiveSection|'all'}): T[] {
  const terms = query.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return filterCapturesByLens(captures,metaMap,lens).filter(capture => {
    if (section !== 'all' && classifyArchiveCapture(capture) !== section) return false;
    const meta = metaMap[capture.id] ?? EMPTY_CAPTURE_META;
    const haystack = [capture.title,capture.summary,capture.extractedText,...capture.tags,...capture.links,
      ...capture.places.map(p=>[p.name,p.address,p.date,...(p.links ?? [])].filter(Boolean).join(' ')),
      meta.note,...getCaptureReasonLabels(meta)].join(' ').normalize('NFKC').toLocaleLowerCase();
    return terms.every(term=>haystack.includes(term));
  });
}
