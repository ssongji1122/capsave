export function isDataUri(url: string): boolean {
  return url.startsWith('data:');
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 클라이언트에서 이미지를 리사이즈하여 Blob으로 반환.
 * Defaults follow the W2 OCR-quality floor: max 2048px width, JPEG quality 0.85.
 * Only downscales when input width > maxWidth (no upscaling, no needless re-encode).
 */
export function resizeImageFile(file: File, maxWidth = 2048, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}
