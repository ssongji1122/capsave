interface CaptureDetailDeleteFlowOptions {
  captureId: number;
  deleteCapture: (id: number) => Promise<boolean>;
  navigateBack: () => void;
}

export async function runCaptureDetailDeleteFlow({
  captureId,
  deleteCapture,
  navigateBack,
}: CaptureDetailDeleteFlowOptions): Promise<boolean> {
  const deleted = await deleteCapture(captureId);
  if (deleted) {
    navigateBack();
  }

  return deleted;
}
