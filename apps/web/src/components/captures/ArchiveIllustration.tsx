type IllustrationKind = 'add' | 'sort' | 'archive' | 'shopping' | 'places' | 'questions' | 'travel' | 'sources';

/** Decorative artwork; adjacent text supplies the action or section name. */
export function ArchiveIllustration({ kind, size = 96 }: { kind: IllustrationKind; size?: number }) {
  return <img src={`/illustrations/${kind}.webp`} alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}
