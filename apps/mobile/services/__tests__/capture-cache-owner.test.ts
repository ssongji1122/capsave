jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import {
  CAPTURE_CACHE_OWNER_KEY,
  clearCaptureCacheOwner,
  getCaptureCacheOwner,
  setCaptureCacheOwner,
} from '../capture-cache-owner';

describe('capture cache owner', () => {
  it('reads, writes, and clears the account-scoped cache marker', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('user-1');

    await expect(getCaptureCacheOwner()).resolves.toBe('user-1');
    await setCaptureCacheOwner('user-2');
    await clearCaptureCacheOwner();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(CAPTURE_CACHE_OWNER_KEY);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CAPTURE_CACHE_OWNER_KEY, 'user-2');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CAPTURE_CACHE_OWNER_KEY);
  });
});
