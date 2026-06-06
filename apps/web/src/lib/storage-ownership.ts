export function isOwnedCaptureStoragePath(path: unknown, userId: string): path is string {
  return typeof path === 'string'
    && path.length > userId.length + 1
    && path.startsWith(`${userId}/`)
    && !path.includes('..')
    && !path.startsWith('/')
    && !path.includes('\\');
}
