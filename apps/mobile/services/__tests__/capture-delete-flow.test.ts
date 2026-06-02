import { runCaptureDetailDeleteFlow } from '../capture-delete-flow';

describe('runCaptureDetailDeleteFlow', () => {
  it('navigates back after a successful delete', async () => {
    const deleteCapture = jest.fn().mockResolvedValue(true);
    const navigateBack = jest.fn();

    await expect(runCaptureDetailDeleteFlow({
      captureId: 1,
      deleteCapture,
      navigateBack,
    })).resolves.toBe(true);

    expect(deleteCapture).toHaveBeenCalledWith(1);
    expect(navigateBack).toHaveBeenCalledTimes(1);
  });

  it('stays on the detail screen after a failed delete', async () => {
    const deleteCapture = jest.fn().mockResolvedValue(false);
    const navigateBack = jest.fn();

    await expect(runCaptureDetailDeleteFlow({
      captureId: 1,
      deleteCapture,
      navigateBack,
    })).resolves.toBe(false);

    expect(deleteCapture).toHaveBeenCalledWith(1);
    expect(navigateBack).not.toHaveBeenCalled();
  });
});
