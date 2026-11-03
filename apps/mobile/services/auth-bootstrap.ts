interface SessionLookupResult<T> {
  data: {
    session: T | null;
  };
  error?: unknown | null;
}

interface RestoredAuthSession<T> {
  session: T | null;
  error: unknown | null;
}

export async function restoreAuthSession<T>(
  lookupSession: () => Promise<SessionLookupResult<T>>
): Promise<RestoredAuthSession<T>> {
  try {
    const result = await lookupSession();

    if (result.error) {
      return { session: null, error: result.error };
    }

    return { session: result.data.session, error: null };
  } catch (error) {
    return { session: null, error };
  }
}
