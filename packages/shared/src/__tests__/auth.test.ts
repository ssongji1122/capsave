import { describe, it, expect } from 'vitest';
import { extractBearerToken } from '../utils/auth';

describe('extractBearerToken', () => {
  it('extracts token from "Bearer abc123"', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('is case-insensitive for "bearer"', () => {
    expect(extractBearerToken('bearer abc123')).toBe('abc123');
  });

  it('returns null for "Basic xxx"', () => {
    expect(extractBearerToken('Basic xxx')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractBearerToken('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it('returns null when token part is empty', () => {
    expect(extractBearerToken('Bearer ')).toBeNull();
  });

  it('handles token with special characters', () => {
    expect(extractBearerToken('Bearer eyJhbGciOi.payload.sig')).toBe('eyJhbGciOi.payload.sig');
  });
});
