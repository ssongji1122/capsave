import type { ArchiveSection } from './capture-archive';
export const ARCHIVE_APPEARANCE = {
 places: { color: '#F0383C', shape: 'blob' },
 shopping: { color: '#F2622E', shape: 'cross' },
 questions: { color: '#1D63C6', shape: 'x' },
 travel: { color: '#8EA8F2', shape: 'star' },
} as const satisfies Record<ArchiveSection, { color: string; shape: string }>;
