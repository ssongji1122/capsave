import { describe, it, expect } from 'vitest';
import { extractStoragePath } from '../utils/storage';

describe('extractStoragePath', () => {
  it('returns path as-is when already a path (not URL)', () => {
    const path = 'abc123/1234567890_abc123.jpg';
    expect(extractStoragePath(path)).toBe('abc123/1234567890_abc123.jpg');
  });

  it('extracts path from Supabase public URL', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/captures/user-id/1234_abc.jpg';
    expect(extractStoragePath(url)).toBe('user-id/1234_abc.jpg');
  });

  it('handles signed URL format', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/sign/captures/user-id/1234_abc.jpg?token=xxx';
    expect(extractStoragePath(url)).toBe('user-id/1234_abc.jpg');
  });

  it('returns empty string for empty input', () => {
    expect(extractStoragePath('')).toBe('');
  });

  it('does not modify data URIs', () => {
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQ...';
    expect(extractStoragePath(dataUri)).toBe(dataUri);
  });
});
