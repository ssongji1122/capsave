'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Clipboard, Images } from 'lucide-react';
import { MAX_BATCH_FILES } from '@/lib/constants';
import { validateSelectedImageFile } from '@/lib/upload-validation';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  onMultipleSelected?: (files: File[]) => void;
  multiple?: boolean;
}

export function UploadZone({ onImageSelected, onMultipleSelected, multiple = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadWarning, setUploadWarning] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: File[]) => {
      const validFiles: File[] = [];
      let firstError = '';

      for (const file of files) {
        const validation = validateSelectedImageFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else if (!firstError) {
          firstError = validation.error;
        }
      }

      if (firstError) {
        setUploadWarning(firstError);
        setTimeout(() => setUploadWarning(''), 4000);
      }

      const images = validFiles;
      if (images.length === 0) return;

      if (multiple && onMultipleSelected && images.length > 1) {
        const limited = images.slice(0, MAX_BATCH_FILES);
        if (images.length > MAX_BATCH_FILES) {
          setUploadWarning(`최대 ${MAX_BATCH_FILES}장까지 업로드 가능합니다. ${images.length}장 중 ${MAX_BATCH_FILES}장만 선택됩니다.`);
          setTimeout(() => setUploadWarning(''), 4000);
        } else {
          setUploadWarning(firstError);
        }
        onMultipleSelected(limited);
      } else {
        setUploadWarning(firstError);
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

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItems = items.filter((item) => item.type.startsWith('image/'));
    if (imageItems.length === 0) return;
    e.preventDefault();
    const files = imageItems.map((item) => item.getAsFile()).filter((f): f is File => f !== null);
    processFiles(files);
  }, [processFiles]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

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

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openFilePicker();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="스크린샷 업로드"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      className={`
        group relative overflow-hidden rounded-3xl border border-dashed p-6 text-center cursor-pointer transition-all sm:p-8
        focus:outline-none focus:ring-2 focus:ring-primary/50
        ${isDragging
          ? 'border-primary bg-primary-surface scale-[1.01]'
          : 'border-border bg-background/40 hover:border-primary/50 hover:bg-surface-elevated'
        }
      `}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-border bg-primary-surface text-primary transition-transform group-hover:scale-105">
        <Camera size={28} aria-hidden="true" />
      </div>
      <p className="text-lg font-bold text-text-primary">스크린샷 추가</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">
        SNS, 지도, 블로그 캡처를 선택하면 장소와 텍스트로 정리합니다.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5">
          <Images size={13} aria-hidden="true" />
          {multiple ? `최대 ${MAX_BATCH_FILES}장` : '이미지 1장'}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5">
          <Clipboard size={13} aria-hidden="true" />
          붙여넣기 지원
        </span>
      </div>
      {uploadWarning && (
        <p className="text-warning text-sm mt-4 font-medium">{uploadWarning}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
