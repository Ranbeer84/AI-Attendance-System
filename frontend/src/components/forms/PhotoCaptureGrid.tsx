import { useRef, useState } from "react";
import type { ChangeEvent } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const combined = [...previews.map((p) => p.file), ...selected].slice(0, maxFiles);
    const newPreviews = combined.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPreviews(newPreviews);
    if (inputRef.current) inputRef.current.value = "";
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

  const isEnough = previews.length >= minFiles;

  return (
    <div className="photo-capture-grid">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="photo-input"
      />

      <p className="photo-hint">
        {previews.length} / {maxFiles} photos selected ({minFiles} minimum recommended for good
        accuracy)
      </p>

      <div className="photo-grid">
        {previews.map((p, index) => (
          <div key={p.previewUrl} className="photo-thumb">
            <img src={p.previewUrl} alt={`Face ${index + 1}`} />
            <button
              type="button"
              className="photo-thumb-remove"
              onClick={() => removePhoto(index)}
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <Button type="button" onClick={handleSubmit} disabled={previews.length === 0}>
        {isEnough ? "Register Faces" : `Register ${previews.length} photo(s) anyway`}
      </Button>
    </div>
  );
}