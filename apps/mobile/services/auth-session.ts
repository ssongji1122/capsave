interface SignOutDeps {
  signOut: () => Promise<unknown>;
  clearCaptures: () => Promise<unknown>;
}

export async function signOutAndClearLocalCaptures({
  signOut,
  clearCaptures,
}: SignOutDeps): Promise<void> {
  let signOutError: unknown;

  try {
    await signOut();
  } catch (error) {
    signOutError = error;
  } finally {
    await clearCaptures();
  }

  if (signOutError) {
    throw signOutError;
  }
}
