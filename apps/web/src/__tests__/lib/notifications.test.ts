import { describe, it, expect } from 'vitest';
import { generateDauNotificationHtml } from '@/lib/notifications';

describe('generateDauNotificationHtml', () => {
  it('includes DAU count in output', () => {
    const html = generateDauNotificationHtml(15, '2026-03-28');
    expect(html).toContain('15');
  });

  it('includes date in output', () => {
    const html = generateDauNotificationHtml(10, '2026-03-28');
    expect(html).toContain('2026-03-28');
  });

  it('contains HTML tags', () => {
    const html = generateDauNotificationHtml(10, '2026-03-28');
    expect(html).toContain('<');
    expect(html).toContain('</');
  });

  it('mentions Phase 1', () => {
    const html = generateDauNotificationHtml(10, '2026-03-28');
    expect(html).toMatch(/phase\s*1/i);
  });
});
