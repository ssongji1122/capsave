'use client';

import { useState, useRef, useCallback } from 'react';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
}

export function UploadZone({ onImageSelected }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    },
    [onImageSelected]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
        ${isDragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-surface-elevated'
        }
      `}
    >
      <div className="text-4xl mb-3">📸</div>
      <p className="text-text-primary font-semibold">이미지를 드래그하거나 클릭하세요</p>
      <p className="text-text-tertiary text-sm mt-1">스크린샷을 업로드하면 AI가 자동 분석합니다</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
