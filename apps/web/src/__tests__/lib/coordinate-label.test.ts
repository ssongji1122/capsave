import { describe, expect, it } from 'vitest';
import { formatCoordinateLabel } from '@/lib/coordinate-label';

describe('formatCoordinateLabel', () => {
  it('uses N and E for positive latitude and longitude (Seoul)', () => {
    expect(formatCoordinateLabel(37.568, 126.832)).toEqual({ latitude: '37.568° N', longitude: '126.832° E' });
  });

  it('uses S for negative latitude (Bali)', () => {
    expect(formatCoordinateLabel(-8.82, 115.09)).toEqual({ latitude: '8.820° S', longitude: '115.090° E' });
  });

  it('uses W for negative longitude and shows its absolute value', () => {
    expect(formatCoordinateLabel(40.713, -74.006)).toEqual({ latitude: '40.713° N', longitude: '74.006° W' });
  });
});
