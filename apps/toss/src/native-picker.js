import { albumImage } from './archive.js';

const ALBUM_IMAGE_MAX_WIDTH = 4096;

export async function pickNativeImage(device) {
  if (!device.getAlbumItems.isSupported()) {
    const error = new Error('토스 앱을 업데이트한 뒤 다시 선택해 주세요.');
    error.code = 'UNSUPPORTED_APP_VERSION';
    throw error;
  }
  const photos = await device.getAlbumItems({
    types: ['PHOTO'], maxCount: 1, base64: true, maxWidth: ALBUM_IMAGE_MAX_WIDTH,
  });
  return photos.length ? albumImage(photos[0].dataUri) : undefined;
}
