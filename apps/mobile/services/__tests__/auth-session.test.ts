import { signOutAndClearLocalCaptures } from '../auth-session';

describe('signOutAndClearLocalCaptures', () => {
  it('clears local captures after signing out', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    const clearCaptures = jest.fn().mockResolvedValue(undefined);
    const clearCacheOwner = jest.fn().mockResolvedValue(undefined);

    await signOutAndClearLocalCaptures({ signOut, clearCaptures, clearCacheOwner });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(clearCaptures).toHaveBeenCalledTimes(1);
    expect(clearCacheOwner).toHaveBeenCalledTimes(1);
  });

  it('still clears local captures when remote sign out fails', async () => {
    const signOutError = new Error('network unavailable');
    const signOut = jest.fn().mockRejectedValue(signOutError);
    const clearCaptures = jest.fn().mockResolvedValue(undefined);
    const clearCacheOwner = jest.fn().mockResolvedValue(undefined);

    await expect(signOutAndClearLocalCaptures({ signOut, clearCaptures, clearCacheOwner })).rejects.toThrow(signOutError);

    expect(clearCaptures).toHaveBeenCalledTimes(1);
    expect(clearCacheOwner).toHaveBeenCalledTimes(1);
  });

  it('attempts both local cleanup operations even when clearing captures fails', async () => {
    const clearError = new Error('sqlite unavailable');
    const clearCaptures = jest.fn().mockRejectedValue(clearError);
    const clearCacheOwner = jest.fn().mockResolvedValue(undefined);

    await expect(signOutAndClearLocalCaptures({
      signOut: jest.fn().mockResolvedValue(undefined),
      clearCaptures,
      clearCacheOwner,
    })).rejects.toThrow(clearError);

    expect(clearCaptures).toHaveBeenCalledTimes(1);
    expect(clearCacheOwner).toHaveBeenCalledTimes(1);
  });
});
