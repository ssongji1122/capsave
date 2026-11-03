interface AsyncAuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createResilientAuthStorage(
  secureStorage: AsyncAuthStorage,
  onUnavailable: () => void = () => undefined
): AsyncAuthStorage {
  const memory = new Map<string, string>();
  let reportedUnavailable = false;
  const reportUnavailable = () => {
    if (reportedUnavailable) return;
    reportedUnavailable = true;
    onUnavailable();
  };

  return {
    async getItem(key) {
      try {
        const value = await secureStorage.getItem(key);
        if (value === null) memory.delete(key);
        else memory.set(key, value);
        return value;
      } catch {
        reportUnavailable();
        return memory.get(key) ?? null;
      }
    },
    async setItem(key, value) {
      memory.set(key, value);
      try {
        await secureStorage.setItem(key, value);
      } catch {
        reportUnavailable();
      }
    },
    async removeItem(key) {
      memory.delete(key);
      try {
        await secureStorage.removeItem(key);
      } catch {
        reportUnavailable();
      }
    },
  };
}
