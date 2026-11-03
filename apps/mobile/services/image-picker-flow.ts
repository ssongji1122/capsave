interface MediaPermissionResult {
  status: string;
  canAskAgain?: boolean;
}

interface CapturePickerResult {
  canceled: boolean;
  assets: Array<{ uri: string }> | null;
}

interface SelectCaptureImageDependencies {
  requestPermission: () => Promise<MediaPermissionResult>;
  openPicker: (options: { mediaTypes: ['images']; quality: 1 }) => Promise<CapturePickerResult>;
  onPermissionDenied: (requiresSettings: boolean) => void;
}

export type CaptureImageSelection =
  | { status: 'selected'; imageUri: string }
  | { status: 'cancelled' | 'permission-denied' | 'error' };

export async function selectCaptureImage({
  requestPermission,
  openPicker,
  onPermissionDenied,
}: SelectCaptureImageDependencies): Promise<CaptureImageSelection> {
  const permission = await requestPermission();
  if (permission.status !== 'granted') {
    onPermissionDenied(permission.canAskAgain === false);
    return { status: 'permission-denied' };
  }

  const result = await openPicker({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled) return { status: 'cancelled' };

  const imageUri = result.assets?.[0]?.uri;
  return imageUri ? { status: 'selected', imageUri } : { status: 'error' };
}
