import { buildStoragePath, shouldUploadForSave } from '../upload-flow';

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

describe('shouldUploadForSave', () => {
  it('does not upload just because analysis finished', () => {
    expect(shouldUploadForSave({
      saveRequested: false,
      hasImageUri: true,
      hasStoragePath: false,
      uploadStatus: 'idle',
    })).toBe(false);
  });

  it('uploads when the user requested save and no storage path exists yet', () => {
    expect(shouldUploadForSave({
      saveRequested: true,
      canSaveCapture: true,
      hasImageUri: true,
      hasStoragePath: false,
      uploadStatus: 'idle',
    })).toBe(true);
  });

  it('does not upload when the capture cannot be saved', () => {
    expect(shouldUploadForSave({
      saveRequested: true,
      canSaveCapture: false,
      hasImageUri: true,
      hasStoragePath: false,
      uploadStatus: 'idle',
    })).toBe(false);
  });

  it('does not upload again when a storage path already exists', () => {
    expect(shouldUploadForSave({
      saveRequested: true,
      hasImageUri: true,
      hasStoragePath: true,
      uploadStatus: 'done',
    })).toBe(false);
  });

  it('does not start another upload while an upload is already running', () => {
    expect(shouldUploadForSave({
      saveRequested: true,
      hasImageUri: true,
      hasStoragePath: false,
      uploadStatus: 'uploading',
    })).toBe(false);
  });
});
