import { ARCHIVE_APPEARANCE, ARCHIVE_SHAPE_PATHS } from '../../../../../packages/shared/src/utils/archive-appearance';
import type { ArchiveSection } from '@scrave/shared';

export function CategoryShape({ section }: { section: ArchiveSection }) {
 const appearance = ARCHIVE_APPEARANCE[section];
 return <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" style={{flexShrink:0}}><path d={ARCHIVE_SHAPE_PATHS[appearance.shape]} fill={appearance.color}/></svg>;
}
