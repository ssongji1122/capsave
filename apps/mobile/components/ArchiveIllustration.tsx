import { Image } from 'expo-image';
const artwork = {
  add: require('../assets/illustrations/add.webp'),
  sort: require('../assets/illustrations/sort.webp'),
  archive: require('../assets/illustrations/archive.webp'),
  shopping: require('../assets/illustrations/shopping.webp'),
  places: require('../assets/illustrations/places.webp'),
  questions: require('../assets/illustrations/questions.webp'),
  travel: require('../assets/illustrations/travel.webp'),
  sources: require('../assets/illustrations/sources.webp'),
};
export function ArchiveIllustration({ kind, size = 96 }: { kind: keyof typeof artwork; size?: number }) {
  return <Image source={artwork[kind]} style={{ width: size, height: size }} contentFit="contain" accessible={false} />;
}
