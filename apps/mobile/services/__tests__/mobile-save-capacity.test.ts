import {
  assertCanSaveCapture,
  CaptureSaveLimitError,
} from '../mobile-save-capacity';

describe('assertCanSaveCapture', () => {
  it('allows save when both local and server counts are below the limit', async () => {
    await expect(assertCanSaveCapture({
      userId: 'user-1',
      localCaptureCount: 3,
      maxCaptures: 10,
      countServerCaptures: jest.fn().mockResolvedValue(4),
    })).resolves.toBeUndefined();
  });

  it('rejects save when the server count has reached the limit even if local state is stale', async () => {
    await expect(assertCanSaveCapture({
      userId: 'user-1',
      localCaptureCount: 0,
      maxCaptures: 10,
      countServerCaptures: jest.fn().mockResolvedValue(10),
    })).rejects.toBeInstanceOf(CaptureSaveLimitError);
  });

  it('rejects save when the visible local count has reached the limit', async () => {
    const countServerCaptures = jest.fn().mockResolvedValue(0);

    await expect(assertCanSaveCapture({
      userId: 'user-1',
      localCaptureCount: 10,
      maxCaptures: 10,
      countServerCaptures,
    })).rejects.toBeInstanceOf(CaptureSaveLimitError);

    expect(countServerCaptures).not.toHaveBeenCalled();
  });
});
