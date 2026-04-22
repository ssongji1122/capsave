import { buildStoragePath } from '../upload-flow';

describe('buildStoragePath', () => {
  it('returns a path of the form userId/timestamp_random.jpg', () => {
    const path = buildStoragePath('abc-123', () => 1700000000000, () => 'xyz789');
    expect(path).toBe('abc-123/1700000000000_xyz789.jpg');
  });

  it('includes only safe filename chars from random', () => {
    const path = buildStoragePath('u', () => 1, () => 'AbC012');
    expect(path).toMatch(/^u\/1_[A-Za-z0-9]+\.jpg$/);
  });

  it('throws if userId is empty', () => {
    expect(() => buildStoragePath('', () => 1, () => 'r')).toThrow(/userId required/);
  });
});
