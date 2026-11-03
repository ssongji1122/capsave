import { restoreAuthSession } from '../auth-bootstrap';

describe('restoreAuthSession', () => {
  it('returns the restored session', async () => {
    const session = { user: { id: 'user-1' } };

    await expect(
      restoreAuthSession(async () => ({ data: { session }, error: null }))
    ).resolves.toEqual({ session, error: null });
  });

  it('finishes signed out when secure storage is unavailable', async () => {
    const storageError = new Error('A required entitlement is not present');

    await expect(
      restoreAuthSession(async () => {
        throw storageError;
      })
    ).resolves.toEqual({ session: null, error: storageError });
  });

  it('surfaces returned auth errors without keeping the app loading', async () => {
    const authError = new Error('session lookup failed');

    await expect(
      restoreAuthSession(async () => ({
        data: { session: null },
        error: authError,
      }))
    ).resolves.toEqual({ session: null, error: authError });
  });
});
