'use client';
import { CategoryShape } from './CategoryShape';
import { ARCHIVE_SECTIONS, type ArchiveSection } from '@scrave/shared';
interface Props { value: ArchiveSection | 'all'; counts: Record<ArchiveSection | 'all', number>; onChange: (value: ArchiveSection | 'all') => void }
export function ArchiveSections({ value, counts, onChange }: Props) {
  return <nav aria-label="캡처 종류" className="flex flex-wrap gap-6 border-b border-border-light py-4 mx-4">
    {[{ id: 'all' as const, label: '전체' }, ...ARCHIVE_SECTIONS].map(section => <button key={section.id} type="button" aria-pressed={value === section.id} onClick={() => onChange(section.id)} className={`inline-flex items-center gap-2 min-h-11 border-b text-sm ${value === section.id ? 'border-primary text-text-primary' : 'border-transparent text-text-secondary'}`}>{section.id !== 'all' && <CategoryShape section={section.id} />}{section.label} {counts[section.id]}</button>)}
  </nav>;
}
