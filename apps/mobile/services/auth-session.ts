interface SignOutDeps {
  signOut: () => Promise<unknown>;
  clearCaptures: () => Promise<unknown>;
  clearCacheOwner: () => Promise<unknown>;
}

export async function signOutAndClearLocalCaptures({
  signOut,
  clearCaptures,
  clearCacheOwner,
}: SignOutDeps): Promise<void> {
  let signOutError: unknown;

  try {
    await signOut();
  } catch (error) {
    signOutError = error;
  }

  const cleanupResults = await Promise.allSettled([
    clearCaptures(),
    clearCacheOwner(),
  ]);

  if (signOutError) {
    throw signOutError;
  }

  const cleanupFailure = cleanupResults.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );
  if (cleanupFailure) {
    throw cleanupFailure.reason;
  }
}
