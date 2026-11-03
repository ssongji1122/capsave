import * as SecureStore from 'expo-secure-store';

export const CAPTURE_CACHE_OWNER_KEY = 'scrave.capture-cache-owner.v1';

export function getCaptureCacheOwner(): Promise<string | null> {
  return SecureStore.getItemAsync(CAPTURE_CACHE_OWNER_KEY);
}

export function setCaptureCacheOwner(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('Capture cache owner requires a user ID.');
  }

  return SecureStore.setItemAsync(CAPTURE_CACHE_OWNER_KEY, userId);
}

export function clearCaptureCacheOwner(): Promise<void> {
  return SecureStore.deleteItemAsync(CAPTURE_CACHE_OWNER_KEY);
}
