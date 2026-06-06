import { describe, expect, it } from 'vitest';
import { shouldBypassAuthForE2E } from '@/lib/e2e-auth-bypass';

describe('shouldBypassAuthForE2E', () => {
  it('allows bypass only when both the env flag and request header are enabled', () => {
    expect(shouldBypassAuthForE2E('1', '1')).toBe(true);
    expect(shouldBypassAuthForE2E(undefined, '1')).toBe(false);
    expect(shouldBypassAuthForE2E('1', null)).toBe(false);
    expect(shouldBypassAuthForE2E('0', '1')).toBe(false);
  });
});
