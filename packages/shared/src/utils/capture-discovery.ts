import type { CaptureItem } from '../types/capture';
import { classifyArchiveCapture } from './capture-archive';
type DiscoveryCapture = Pick<CaptureItem, 'id' | 'category' | 'title' | 'summary' | 'extractedText' | 'tags' | 'links' | 'places' | 'source' | 'sourceAccountId' | 'createdAt'>;
export type CaptureSort = 'recent' | 'upcoming' | 'related';
export const CAPTURE_SORT_OPTIONS = [
  {id:'recent',label:'최근 저장순'}, {id:'upcoming',label:'일정 가까운순'}, {id:'related',label:'연관순'},
] as const;
const TAG_WEIGHT = 3;
const PLACE_WEIGHT = 5;
const ACCOUNT_WEIGHT = 1;
const normalize = (value:string) => value.trim().toLocaleLowerCase();
const timestamp = (value:string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : -Infinity;
function day(value:string):string | undefined {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (!match) return;
  const parsed = new Date(`${match[1]}T00:00:00Z`);
  if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === match[1]) return match[1];
}
export function nextCaptureDate(capture:DiscoveryCapture,today:string):string | undefined {
  return capture.places.map(p=>day(p.date ?? '')).filter((d):d is string=>!!d && d>=today).sort()[0];
}
export function relatedCaptures<T extends DiscoveryCapture>(anchor:T,captures:T[]) {
  return captures.filter(c=>c.id!==anchor.id && classifyArchiveCapture(c)===classifyArchiveCapture(anchor)).map(capture=>{
    const reasons:string[]=[];
    let score=0;
    const tags=new Set(capture.tags.map(normalize).filter(Boolean));
    for(const tag of new Set(anchor.tags.filter(t=>tags.has(normalize(t))))) {reasons.push(`같은 태그 · ${tag}`);score+=TAG_WEIGHT;}
    const places=new Set(capture.places.map(p=>normalize(p.name)).filter(Boolean));
    for(const name of new Set(anchor.places.map(p=>p.name).filter(n=>places.has(normalize(n))))) {reasons.push(`같은 장소 · ${name}`);score+=PLACE_WEIGHT;}
    if(anchor.sourceAccountId && capture.sourceAccountId && anchor.source===capture.source && normalize(anchor.sourceAccountId)===normalize(capture.sourceAccountId)) {reasons.push(`같은 계정 · ${anchor.sourceAccountId}`);score+=ACCOUNT_WEIGHT;}
    return {capture,reasons,score};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score || timestamp(b.capture.createdAt)-timestamp(a.capture.createdAt));
}
export function sortCaptures<T extends DiscoveryCapture>(captures:T[],mode:CaptureSort,anchor?:T,today = new Date().toLocaleDateString('sv-SE')):T[] {
  const recent=[...captures].sort((a,b)=>timestamp(b.createdAt)-timestamp(a.createdAt));
  if(mode==='related' && anchor) {
    const matches=relatedCaptures(anchor,recent).map(r=>r.capture);
    const ids=new Set([anchor.id,...matches.map(c=>c.id)]);
    return [...recent.filter(c=>c.id===anchor.id),...matches,...recent.filter(c=>!ids.has(c.id))];
  }
  if(mode==='upcoming') return recent.sort((a,b)=>{
    const ad=nextCaptureDate(a,today),bd=nextCaptureDate(b,today);
    if(ad && bd) return ad.localeCompare(bd);
    if(ad || bd) return ad ? -1 : 1;
    const ap=a.places.some(p=>!!day(p.date??'')),bp=b.places.some(p=>!!day(p.date??''));
    return Number(bp)-Number(ap);
  });
  return recent;
}
