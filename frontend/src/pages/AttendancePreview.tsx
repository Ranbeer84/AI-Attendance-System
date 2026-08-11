import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

import Layout from "../components/layout/Layout";
import Loader from "../components/shared/Loader";
import Button from "../components/shared/Button";

import { getJobStatus, confirmAttendance } from "../api/attendanceApi";
import { getStudents } from "../api/studentApi";

import type {
  DetectedFace,
  JobStatus,
  Student,
  AttendanceStatus,
} from "../types";

interface ReviewRow {
  faceIndex: number;
  studentId: string | null;
  studentName: string | null;
  confidence: number | null;
  status: AttendanceStatus;
  detScore: number;
}

const POLL_INTERVAL_MS = 2000;

export default function AttendancePreview() {
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { classId?: string; subjectId?: string | null } | null;

  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (state?.classId) {
      getStudents(state.classId).then(setClassStudents);
    }
  }, [state?.classId]);

  useEffect(() => {
    if (!jobId) return;

    async function poll() {
      try {
        const status = await getJobStatus(jobId!);
        setJobStatus(status);

        if (status.status === "completed" && status.result) {
          const initialRows: ReviewRow[] = status.result.faces.map((face: DetectedFace, index) => ({
            faceIndex: index,
            studentId: face.student_id,
            studentName: face.student_name,
            confidence: face.confidence,
            status: face.status === "matched" ? "present" : "absent",
            detScore: face.det_score,
          }));
          setRows(initialRows);
        }

        if (status.status === "failed") {
          setError(status.error || "Processing failed");
        }

        if (status.status === "completed" || status.status === "failed") {
          if (pollRef.current) window.clearTimeout(pollRef.current);
          return;
        }

        pollRef.current = window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to check job status");
      }
    }

    poll();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [jobId]);

  function updateRowStudent(faceIndex: number, studentId: string) {
    const matchedStudent = classStudents.find((s) => s.id === studentId);
    setRows((prev) =>
      prev.map((row) =>
        row.faceIndex === faceIndex
          ? {
              ...row,
              studentId: studentId || null,
              studentName: matchedStudent?.name || null,
              status: studentId ? "present" : "absent",
            }
          : row
      )
    );
  }

  function updateRowStatus(faceIndex: number, status: AttendanceStatus) {
    setRows((prev) => (prev.map((row) => (row.faceIndex === faceIndex ? { ...row, status } : row))));
  }

  function addManualRow() {
    setRows((prev) => [
      ...prev,
      { faceIndex: prev.length + 1000, studentId: null, studentName: null, confidence: null, status: "present", detScore: 0 },
    ]);
  }

  async function handleConfirm() {
    if (!state?.classId) {
      setError("Missing class context -- please start again from Take Attendance");
      return;
    }

    const validRows = rows.filter((r) => r.studentId);
    if (validRows.length === 0) {
      setError("No students to save -- match at least one face to a student");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await confirmAttendance({
        class_id: state.classId,
        subject_id: state.subjectId || null,
        source_photo_url: jobStatus?.result?.source_photo_url || null,
        records: validRows.map((r) => ({
          student_id: r.studentId as string,
          status: r.status,
          confidence: r.confidence,
        })),
      });
      navigate("/attendance/history");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  }

  if (!jobId) {
    return (
      <Layout>
        <div className="error-banner">Missing job id</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="page-title">Review Attendance</h1>

      {error && <div className="error-banner">{error}</div>}

      {(!jobStatus || jobStatus.status === "pending" || jobStatus.status === "processing") && (
        <Loader label={`Processing photo... (${jobStatus?.status || "queued"})`} fullScreen={false} />
      )}

      {jobStatus?.status === "completed" && jobStatus.result && (
        <>
          <p className="page-subtitle">
            Detected {jobStatus.result.total_faces_detected} face(s). Review and correct matches
            before saving.
          </p>

          <div className="preview-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Matched Student</th>
                  <th>Confidence</th>
                  <th>Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.faceIndex}>
                    <td>{row.faceIndex + 1}</td>
                    <td>
                      <select
                        className="form-input"
                        value={row.studentId || ""}
                        onChange={(e) => updateRowStudent(row.faceIndex, e.target.value)}
                      >
                        <option value="">-- Unmatched / Ignore --</option>
                        {classStudents.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.roll_number})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {row.confidence !== null ? (
                        <span
                          className={`confidence-badge ${
                            row.confidence > 0.7 ? "confidence-high" : "confidence-low"
                          }`}
                        >
                          {(row.confidence * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="confidence-badge confidence-manual">manual</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="form-input"
                        value={row.status}
                        onChange={(e) => updateRowStatus(row.faceIndex, e.target.value as AttendanceStatus)}
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="button-row">
            <button className="btn btn-secondary" onClick={addManualRow}>
              + Add Student Manually
            </button>
            <Button onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? "Saving..." : "Confirm & Save Attendance"}
            </Button>
          </div>
        </>
      )}

      {jobStatus?.status === "failed" && (
        <div className="error-banner">Processing failed: {jobStatus.error}</div>
      )}
    </Layout>
  );
}