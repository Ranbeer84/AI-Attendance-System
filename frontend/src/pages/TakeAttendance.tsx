import { useEffect, useState, useCallback } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/layout/Layout";
import Button from "../components/shared/Button";

import { getClasses, getSubjects } from "../api/studentApi";
import { uploadGroupPhoto } from "../api/attendanceApi";

import type { SchoolClass, Subject } from "../types";

const icons = {
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function TakeAttendance() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    getClasses().then(setClasses);
    getSubjects().then(setSubjects);
  }, []);

  const processFile = useCallback((selected: File | undefined) => {
    if (!selected || !selected.type.startsWith("image/")) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    processFile(e.target.files?.[0]);
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
    processFile(e.dataTransfer.files?.[0]);
  }

  function handleRemoveFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function handleUpload() {
    if (!file || !classId) {
      setError("Please select a class and a group photo");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      const { job_id } = await uploadGroupPhoto(file, classId);
      navigate(`/attendance/preview/${job_id}`, {
        state: { classId, subjectId: subjectId || null },
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Layout>
      <div className="attendance-page">
        <div className="page-hero" style={{ marginBottom: 32 }}>
          <span className="page-hero-eyebrow">Attendance</span>
          <h1 className="page-hero-title">Take Attendance</h1>
          <p className="page-hero-subtitle">
            Upload a group photo and let AI detect faces automatically.
          </p>
        </div>

        <div className="reg-card">
          {error && <div className="error-banner">{error}</div>}

          {isUploading ? (
            <div className="attendance-uploading">
              <div className="attendance-uploading__spinner" />
              <p className="attendance-uploading__text">Uploading & detecting faces…</p>
              <p className="attendance-uploading__sub">This usually takes a few seconds</p>
            </div>
          ) : (
            <>
              <div className="attendance-form">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="attendance-class">
                      Class
                    </label>
                    <div className="form-input-wrap">
                      <span className="form-input-wrap__icon">{icons.users}</span>
                      <select
                        id="attendance-class"
                        className="form-input"
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                      >
                        <option value="">-- Select a class --</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.section ? `— ${c.section}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="attendance-subject">
                      Subject <span className="form-label__optional">(optional)</span>
                    </label>
                    <div className="form-input-wrap">
                      <span className="form-input-wrap__icon">{icons.book}</span>
                      <select
                        id="attendance-subject"
                        className="form-input"
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                      >
                        <option value="">-- No specific subject --</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Group Photo</label>
                  {!previewUrl ? (
                    <div
                      className={`attendance-dropzone${isDragOver ? " attendance-dropzone--dragover" : ""}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("group-photo")?.click()}
                    >
                      <input
                        id="group-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="attendance-dropzone__input"
                      />
                      <div className="attendance-dropzone__icon">{icons.camera}</div>
                      <p className="attendance-dropzone__title">
                        {isDragOver ? "Drop photo here" : "Click or drag a group photo"}
                      </p>
                      <p className="attendance-dropzone__subtitle">
                        JPG, PNG, WebP • One clear group shot
                      </p>
                    </div>
                  ) : (
                    <div className="attendance-preview">
                      <img
                        src={previewUrl}
                        alt="Group preview"
                        className="attendance-preview__image"
                      />
                      <div className="attendance-preview__overlay">
                        <div className="attendance-preview__meta">
                          <span className="attendance-preview__filename">{file?.name}</span>
                          <span className="attendance-preview__size">
                            {file ? formatBytes(file.size) : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="attendance-preview__change"
                          onClick={handleRemoveFile}
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || !classId}
                style={{ marginTop: 8 }}
              >
                {file && classId ? (
                  <>
                    {icons.upload}
                    Upload & Detect Faces
                  </>
                ) : (
                  "Upload & Detect Faces"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}