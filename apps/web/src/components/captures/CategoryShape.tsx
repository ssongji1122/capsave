import { ARCHIVE_APPEARANCE, type ArchiveSection } from '@scrave/shared';
const PATHS = {
 blob: 'M8 1C10 0 11 3 13 3S16 7 14 9S14 13 11 13S8 16 6 14S2 14 2 11S-1 8 1 6S3 2 5 2Z',
 cross: 'M6 1H10V6H15V10H10V15H6V10H1V6H6Z',
 x: 'M3 1L8 6L13 1L15 3L10 8L15 13L13 15L8 10L3 15L1 13L6 8L1 3Z',
 star: 'M8 0L10 5L16 5L12 9L13 15L8 12L3 15L4 9L0 5L6 5Z',
};
export function CategoryShape({ section }: { section: ArchiveSection }) {
 const appearance = ARCHIVE_APPEARANCE[section];
 return <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" style={{flexShrink:0}}><path d={PATHS[appearance.shape]} fill={appearance.color}/></svg>;
}
