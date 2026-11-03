import { createResilientAuthStorage } from '../auth-storage';

describe('createResilientAuthStorage', () => {
  it('keeps the current session in memory when secure storage is unavailable', async () => {
    const onUnavailable = jest.fn();
    const storage = createResilientAuthStorage({
      getItem: async () => { throw new Error('missing entitlement'); },
      setItem: async () => { throw new Error('missing entitlement'); },
      removeItem: async () => { throw new Error('missing entitlement'); },
    }, onUnavailable);

    await expect(storage.setItem('session', 'token')).resolves.toBeUndefined();
    await expect(storage.getItem('session')).resolves.toBe('token');
    await expect(storage.removeItem('session')).resolves.toBeUndefined();
    await expect(storage.getItem('session')).resolves.toBeNull();
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it('delegates to secure storage when it is available', async () => {
    const values = new Map<string, string>();
    const storage = createResilientAuthStorage({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    });

    await storage.setItem('session', 'token');
    await expect(storage.getItem('session')).resolves.toBe('token');
    await storage.removeItem('session');
    await expect(storage.getItem('session')).resolves.toBeNull();
  });
});
