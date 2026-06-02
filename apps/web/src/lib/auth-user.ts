interface MaybeAuthUser {
  id?: string | null;
  is_anonymous?: boolean | null;
}

export function isRealAuthenticatedUser(user: MaybeAuthUser | null | undefined): boolean {
  return Boolean(user?.id) && user?.is_anonymous !== true;
}

export function getRealUserId(user: MaybeAuthUser | null | undefined): string | null {
  return isRealAuthenticatedUser(user) ? user!.id! : null;
}
