import { selectCaptureImage } from '../image-picker-flow';

describe('selectCaptureImage', () => {
  it('does not open the picker after a recoverable permission denial', async () => {
    const openPicker = jest.fn();
    const onPermissionDenied = jest.fn();

    await expect(selectCaptureImage({
      requestPermission: async () => ({ status: 'denied', canAskAgain: true }),
      openPicker,
      onPermissionDenied,
    })).resolves.toEqual({ status: 'permission-denied' });

    expect(openPicker).not.toHaveBeenCalled();
    expect(onPermissionDenied).toHaveBeenCalledWith(false);
  });

  it('offers settings recovery when photo access is permanently blocked', async () => {
    const openPicker = jest.fn();
    const onPermissionDenied = jest.fn();

    await expect(selectCaptureImage({
      requestPermission: async () => ({ status: 'denied', canAskAgain: false }),
      openPicker,
      onPermissionDenied,
    })).resolves.toEqual({ status: 'permission-denied' });

    expect(openPicker).not.toHaveBeenCalled();
    expect(onPermissionDenied).toHaveBeenCalledWith(true);
  });

  it('leaves the current screen unchanged when selection is cancelled', async () => {
    await expect(selectCaptureImage({
      requestPermission: async () => ({ status: 'granted', canAskAgain: true }),
      openPicker: async () => ({ canceled: true, assets: null }),
      onPermissionDenied: jest.fn(),
    })).resolves.toEqual({ status: 'cancelled' });
  });

  it('requests the highest picker quality and returns the selected image URI', async () => {
    const openPicker = jest.fn().mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///selected.png' }],
    });

    await expect(selectCaptureImage({
      requestPermission: async () => ({ status: 'granted', canAskAgain: true }),
      openPicker,
      onPermissionDenied: jest.fn(),
    })).resolves.toEqual({ status: 'selected', imageUri: 'file:///selected.png' });

    expect(openPicker).toHaveBeenCalledWith({ mediaTypes: ['images'], quality: 1 });
  });

  it('returns an explicit error state when the picker has no usable image', async () => {
    await expect(selectCaptureImage({
      requestPermission: async () => ({ status: 'granted', canAskAgain: true }),
      openPicker: async () => ({ canceled: false, assets: [] }),
      onPermissionDenied: jest.fn(),
    })).resolves.toEqual({ status: 'error' });
  });
});
