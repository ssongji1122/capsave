import type { CaptureItem } from '../database';
import { migrateLocalCapturesToAccount } from '../local-migration';

function makeCapture(id: number, title: string): CaptureItem {
  return {
    id,
    category: 'text',
    title,
    summary: '',
    places: [],
    extractedText: title,
    links: [],
    tags: [],
    source: 'other',
    imageUri: `file:///local-${id}.jpg`,
    confidence: 1,
    sourceAccountId: null,
    createdAt: '2026-05-20T00:00:00.000Z',
  };
}

describe('migrateLocalCapturesToAccount', () => {
  it('removes local captures after all items migrate successfully', async () => {
    const captures = [makeCapture(1, 'a'), makeCapture(2, 'b')];
    const replaceLocalCaptures = jest.fn().mockResolvedValue(undefined);
    const uploadLocalImage = jest.fn()
      .mockResolvedValueOnce('user-1/a.jpg')
      .mockResolvedValueOnce('user-1/b.jpg');
    const saveRemoteCapture = jest.fn().mockResolvedValue(undefined);

    const result = await migrateLocalCapturesToAccount({
      userId: 'user-1',
      getLocalCaptures: jest.fn().mockResolvedValue(captures),
      uploadLocalImage,
      saveRemoteCapture,
      replaceLocalCaptures,
    });

    expect(result).toEqual({ done: 2, failed: 0, total: 2 });
    expect(saveRemoteCapture).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: 'a' }),
      'user-1/a.jpg',
      'user-1'
    );
    expect(saveRemoteCapture).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: 'b' }),
      'user-1/b.jpg',
      'user-1'
    );
    expect(replaceLocalCaptures).toHaveBeenCalledWith([]);
  });

  it('keeps failed local captures instead of clearing everything', async () => {
    const success = makeCapture(1, 'success');
    const failed = makeCapture(2, 'failed');
    const replaceLocalCaptures = jest.fn().mockResolvedValue(undefined);

    const result = await migrateLocalCapturesToAccount({
      userId: 'user-1',
      getLocalCaptures: jest.fn().mockResolvedValue([success, failed]),
      uploadLocalImage: jest.fn()
        .mockResolvedValueOnce('user-1/success.jpg')
        .mockResolvedValueOnce('user-1/failed.jpg'),
      saveRemoteCapture: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('network')),
      replaceLocalCaptures,
    });

    expect(result).toEqual({ done: 1, failed: 1, total: 2 });
    expect(replaceLocalCaptures).toHaveBeenCalledWith([failed]);
  });

  it('reports progress after each attempted capture', async () => {
    const captures = [makeCapture(1, 'a'), makeCapture(2, 'b')];
    const onProgress = jest.fn();

    await migrateLocalCapturesToAccount({
      userId: 'user-1',
      getLocalCaptures: jest.fn().mockResolvedValue(captures),
      uploadLocalImage: jest.fn()
        .mockResolvedValueOnce('user-1/a.jpg')
        .mockResolvedValueOnce('user-1/b.jpg'),
      saveRemoteCapture: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('network')),
      replaceLocalCaptures: jest.fn().mockResolvedValue(undefined),
      onProgress,
    });

    expect(onProgress).toHaveBeenCalledWith({ done: 1, failed: 0, total: 2 });
    expect(onProgress).toHaveBeenCalledWith({ done: 1, failed: 1, total: 2 });
  });

  it('keeps failed captures and does not save remotely when local image upload fails', async () => {
    const failed = makeCapture(1, 'failed upload');
    const saveRemoteCapture = jest.fn();
    const replaceLocalCaptures = jest.fn().mockResolvedValue(undefined);

    const result = await migrateLocalCapturesToAccount({
      userId: 'user-1',
      getLocalCaptures: jest.fn().mockResolvedValue([failed]),
      uploadLocalImage: jest.fn().mockRejectedValue(new Error('upload failed')),
      saveRemoteCapture,
      replaceLocalCaptures,
    });

    expect(result).toEqual({ done: 0, failed: 1, total: 1 });
    expect(saveRemoteCapture).not.toHaveBeenCalled();
    expect(replaceLocalCaptures).toHaveBeenCalledWith([failed]);
  });

  it('deletes an uploaded image when remote save fails during migration', async () => {
    const failed = makeCapture(1, 'failed remote save');
    const deleteUploadedImage = jest.fn().mockResolvedValue(undefined);

    const result = await migrateLocalCapturesToAccount({
      userId: 'user-1',
      getLocalCaptures: jest.fn().mockResolvedValue([failed]),
      uploadLocalImage: jest.fn().mockResolvedValue('user-1/uploaded.jpg'),
      saveRemoteCapture: jest.fn().mockRejectedValue(new Error('remote failed')),
      replaceLocalCaptures: jest.fn().mockResolvedValue(undefined),
      deleteUploadedImage,
    });

    expect(result).toEqual({ done: 0, failed: 1, total: 1 });
    expect(deleteUploadedImage).toHaveBeenCalledWith('user-1/uploaded.jpg');
  });

  it('reuses existing storage paths without uploading again', async () => {
    const capture = makeCapture(1, 'already uploaded');
    capture.imageUri = 'user-1/existing.jpg';
    const uploadLocalImage = jest.fn();
    const saveRemoteCapture = jest.fn().mockResolvedValue(undefined);

    await migrateLocalCapturesToAccount({
      userId: 'user-1',
      getLocalCaptures: jest.fn().mockResolvedValue([capture]),
      uploadLocalImage,
      saveRemoteCapture,
      replaceLocalCaptures: jest.fn().mockResolvedValue(undefined),
    });

    expect(uploadLocalImage).not.toHaveBeenCalled();
    expect(saveRemoteCapture).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'already uploaded' }),
      'user-1/existing.jpg',
      'user-1'
    );
  });
});
