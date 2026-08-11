import { useRef, useState, useCallback } from "react";
import type { ChangeEvent, DragEvent } from "react";

import Button from "../shared/Button";

interface PhotoCaptureGridProps {
  onFilesReady: (files: File[]) => void;
  maxFiles?: number;
  minFiles?: number;
}

interface PreviewFile {
  file: File;
  previewUrl: string;
}

export default function PhotoCaptureGrid({
  onFilesReady,
  maxFiles = 30,
  minFiles = 15,
}: PhotoCaptureGridProps) {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      const selected = Array.from(fileList || []).filter((f) =>
        f.type.startsWith("image/")
      );
      if (selected.length === 0) return;

      setPreviews((prev) => {
        const combined = [...prev.map((p) => p.file), ...selected].slice(0, maxFiles);
        return combined.map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
        }));
      });
    },
    [maxFiles]
  );

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }

  function removePhoto(index: number) {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleSubmit() {
    onFilesReady(previews.map((p) => p.file));
  }

  const progress = Math.min((previews.length / minFiles) * 100, 100);
  const isEnough = previews.length >= minFiles;

  return (
    <div className="photo-capture-grid">
      {/* Dropzone */}
      <div
        className={`photo-dropzone${isDragOver ? " photo-dropzone--dragover" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="photo-dropzone__input"
        />

        <div className="photo-dropzone__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="photo-dropzone__title">Click or drag photos here</p>
        <p className="photo-dropzone__subtitle">
          JPG, PNG, WebP • Up to {maxFiles} photos
        </p>
      </div>

      {/* Progress */}
      {previews.length > 0 && (
        <div className="photo-progress">
          <div className="photo-progress__bar">
            <div
              className="photo-progress__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span
            className={`photo-progress__text${
              isEnough ? " photo-progress__text--ready" : ""
            }`}
          >
            {previews.length} / {minFiles} recommended
          </span>
        </div>
      )}

      {/* Grid */}
      {previews.length > 0 ? (
        <div className="photo-grid">
          {previews.map((p, index) => (
            <div key={p.previewUrl} className="photo-thumb">
              <img src={p.previewUrl} alt={`Face ${index + 1}`} />
              <span className="photo-thumb__index">{index + 1}</span>
              <button
                type="button"
                className="photo-thumb-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(index);
                }}
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="photo-empty">No photos selected yet</div>
      )}

      {/* Submit */}
      <div className="photo-submit-row">
        <p
          className={`photo-submit-hint${
            isEnough ? " photo-submit-hint--ready" : ""
          }`}
        >
          {isEnough
            ? "✓ Great! You have enough photos for accurate recognition."
            : `Tip: Upload at least ${minFiles} photos for best accuracy.`}
        </p>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={previews.length === 0}
        >
          {isEnough
            ? "Register Faces"
            : `Register ${previews.length} photo${previews.length !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}