import { Ionicons } from '@expo/vector-icons';
import { ARCHIVE_APPEARANCE, type ArchiveSection } from '@scrave/shared';
const ICONS = { blob: 'flower', cross: 'add', x: 'close', star: 'star' } as const;
export function CategoryShape({ section }: { section: ArchiveSection }) {
 const appearance = ARCHIVE_APPEARANCE[section];
 return <Ionicons name={ICONS[appearance.shape]} size={12} color={appearance.color} accessible={false}/>;
}
