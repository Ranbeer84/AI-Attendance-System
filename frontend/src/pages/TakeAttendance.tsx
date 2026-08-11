import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

import { useNavigate } from "react-router-dom";

import Layout from "../components/layout/Layout";
import Button from "../components/shared/Button";
import Loader from "../components/shared/Loader";

import { getClasses, getSubjects } from "../api/studentApi";
import { uploadGroupPhoto } from "../api/attendanceApi";

import type { SchoolClass, Subject } from "../types";

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

  useEffect(() => {
    getClasses().then(setClasses);
    getSubjects().then(setSubjects);
  }, []);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
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
      navigate(`/attendance/preview/${job_id}`, { state: { classId, subjectId: subjectId || null } });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Layout>
      <h1 className="page-title">Take Attendance</h1>

      <div className="card card-inline">
        {error && <div className="error-banner">{error}</div>}

        <div className="form-group">
          <label className="form-label">Class</label>
          <select className="form-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">-- Select a class --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section ? `- ${c.section}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Subject (optional)</label>
          <select
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

        <div className="form-group">
          <label className="form-label">Group Photo</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </div>

        {previewUrl && (
          <div className="group-photo-preview">
            <img src={previewUrl} alt="Group photo preview" />
          </div>
        )}

        {isUploading ? (
          <Loader label="Uploading photo..." />
        ) : (
          <Button onClick={handleUpload} disabled={!file || !classId}>
            Upload & Detect Faces
          </Button>
        )}
      </div>
    </Layout>
  );
}