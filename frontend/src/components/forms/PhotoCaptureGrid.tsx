import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";

import Button from "../shared/Button";

interface PhotoCaptureGridProps {
  onFilesReady: (files: File[]) => void;
  maxFiles?: number;
  minFiles?: number;
  /** While true the grid stays mounted (so selected photos are kept) but is locked. */
  isUploading?: boolean;
}

interface PreviewFile {
  id: string;
  file: File;
  previewUrl: string;
}

// Must match the backend (utils/image_utils.py ALLOWED_CONTENT_TYPES, MAX_UPLOAD_SIZE_MB).
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_MB = 5;

function fileKey(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

export default function PhotoCaptureGrid({
  onFilesReady,
  maxFiles = 5,
  minFiles = 3,
  isUploading = false,
}: PhotoCaptureGridProps) {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<PreviewFile[]>([]);
  previewsRef.current = previews;

  // Free every object URL when the component goes away.
  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const processFiles = useCallback(
    (fileList: FileList | null) => {
      // Copy synchronously: clearing the <input> afterwards empties the live FileList.
      const incoming = Array.from(fileList ?? []);
      if (incoming.length === 0) return;

      const problems: string[] = [];
      const existingKeys = new Set(previewsRef.current.map((p) => fileKey(p.file)));
      const accepted: File[] = [];

      for (const file of incoming) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          problems.push(`${file.name}: unsupported type (use JPG, PNG or WebP)`);
        } else if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          problems.push(`${file.name}: larger than ${MAX_FILE_SIZE_MB}MB`);
        } else if (existingKeys.has(fileKey(file))) {
          problems.push(`${file.name}: already added`);
        } else {
          existingKeys.add(fileKey(file));
          accepted.push(file);
        }
      }

      const slots = Math.max(maxFiles - previewsRef.current.length, 0);
      const toAdd = accepted.slice(0, slots);
      const overflow = accepted.length - toAdd.length;
      if (overflow > 0) {
        problems.push(`${overflow} photo${overflow > 1 ? "s" : ""} not added (maximum is ${maxFiles})`);
      }

      setNotice(problems.length ? problems.join(" • ") : null);

      if (toAdd.length > 0) {
        const added: PreviewFile[] = toAdd.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        }));
        setPreviews((prev) => [...prev, ...added]);
      }
    },
    [maxFiles]
  );

  function openPicker() {
    if (isUploading) return;
    inputRef.current?.click();
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    processFiles(e.target.files);
    e.target.value = ""; // allow re-selecting the same file later
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (!isUploading) processFiles(e.dataTransfer.files);
  }

  function removePhoto(id: string) {
    setPreviews((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setNotice(null);
  }

  function handleSubmit() {
    if (previews.length === 0 || isUploading) return;
    onFilesReady(previews.map((p) => p.file));
  }

  const progress = Math.min((previews.length / minFiles) * 100, 100);
  const isEnough = previews.length >= minFiles;

  return (
    <div className="photo-capture-grid">
      {/* Hidden native input, OUTSIDE the dropzone, so the dropzone's click handler
          is the only thing that opens the picker (no double-trigger). */}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        onChange={handleFileSelect}
        className="photo-dropzone__input"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Dropzone */}
      <div
        className={`photo-dropzone${isDragOver ? " photo-dropzone--dragover" : ""}${
          isUploading ? " photo-dropzone--disabled" : ""
        }`}
        role="button"
        tabIndex={0}
        aria-disabled={isUploading}
        onClick={openPicker}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="photo-dropzone__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="photo-dropzone__title">Click or drag photos here</p>
        <p className="photo-dropzone__subtitle">
          JPG, PNG, WebP • Up to {maxFiles} photos • Max {MAX_FILE_SIZE_MB}MB each
        </p>
      </div>

      {notice && <div className="photo-notice">{notice}</div>}

      {/* Progress */}
      {previews.length > 0 && (
        <div className="photo-progress">
          <div className="photo-progress__bar">
            <div className="photo-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <span className={`photo-progress__text${isEnough ? " photo-progress__text--ready" : ""}`}>
            {previews.length} / {minFiles} recommended
          </span>
        </div>
      )}

      {/* Grid */}
      {previews.length > 0 ? (
        <div className="photo-grid">
          {previews.map((p, index) => (
            <div key={p.id} className="photo-thumb">
              <img src={p.previewUrl} alt={`Face ${index + 1}`} />
              <span className="photo-thumb__index">{index + 1}</span>
              <button
                type="button"
                className="photo-thumb-remove"
                onClick={() => removePhoto(p.id)}
                disabled={isUploading}
                aria-label={`Remove photo ${index + 1}`}
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
        <p className={`photo-submit-hint${isEnough ? " photo-submit-hint--ready" : ""}`}>
          {isEnough
            ? "✓ Great! You have enough photos for accurate recognition."
            : `Tip: Upload at least ${minFiles} photos for best accuracy.`}
        </p>
        <Button type="button" onClick={handleSubmit} disabled={previews.length === 0 || isUploading}>
          {isUploading ? (
            <>
              <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Processing…
            </>
          ) : isEnough ? (
            "Register Faces"
          ) : (
            `Register ${previews.length} photo${previews.length !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>
    </div>
  );
}
