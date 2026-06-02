import { signOutAndClearLocalCaptures } from '../auth-session';

describe('signOutAndClearLocalCaptures', () => {
  it('clears local captures after signing out', async () => {
    const signOut = jest.fn().mockResolvedValue(undefined);
    const clearCaptures = jest.fn().mockResolvedValue(undefined);

    await signOutAndClearLocalCaptures({ signOut, clearCaptures });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(clearCaptures).toHaveBeenCalledTimes(1);
  });

  it('still clears local captures when remote sign out fails', async () => {
    const signOutError = new Error('network unavailable');
    const signOut = jest.fn().mockRejectedValue(signOutError);
    const clearCaptures = jest.fn().mockResolvedValue(undefined);

    await expect(signOutAndClearLocalCaptures({ signOut, clearCaptures })).rejects.toThrow(signOutError);

    expect(clearCaptures).toHaveBeenCalledTimes(1);
  });
});
