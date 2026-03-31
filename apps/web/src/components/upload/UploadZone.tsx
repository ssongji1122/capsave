'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_BATCH_FILES = 10;

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  onMultipleSelected?: (files: File[]) => void;
  multiple?: boolean;
}

export function UploadZone({ onImageSelected, onMultipleSelected, multiple = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [limitWarning, setLimitWarning] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: File[]) => {
      // Accept any file from file picker (trust accept= attribute for filtering)
      // Some browsers return empty type for HEIC/HEIF images
      const images = files.filter((f) => !f.type || f.type.startsWith('image/'));
      if (images.length === 0) return;

      if (multiple && onMultipleSelected && images.length > 1) {
        const limited = images.slice(0, MAX_BATCH_FILES);
        if (images.length > MAX_BATCH_FILES) {
          setLimitWarning(`최대 ${MAX_BATCH_FILES}장까지 업로드 가능합니다. ${images.length}장 중 ${MAX_BATCH_FILES}장만 선택됩니다.`);
          setTimeout(() => setLimitWarning(''), 4000);
        } else {
          setLimitWarning('');
        }
        onMultipleSelected(limited);
      } else {
        setLimitWarning('');
        onImageSelected(images[0]);
      }
    },
    [onImageSelected, onMultipleSelected, multiple]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      processFiles(files);
    },
    [processFiles]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    processFiles(fileArray);
    // Reset after short delay so same file can be re-selected
    setTimeout(() => {
      if (inputRef.current) inputRef.current.value = '';
    }, 100);
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
      <p className="text-text-tertiary text-sm mt-1">
        스크린샷을 업로드하면 AI가 자동 분석합니다{multiple && ` (최대 ${MAX_BATCH_FILES}장)`}
      </p>
      {limitWarning && (
        <p className="text-warning text-sm mt-2 font-medium">{limitWarning}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
