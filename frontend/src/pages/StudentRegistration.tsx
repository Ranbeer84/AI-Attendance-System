import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/layout/Layout";
import StudentForm from "../components/forms/StudentForm";
import PhotoCaptureGrid from "../components/forms/PhotoCaptureGrid";
import Loader from "../components/shared/Loader";

import {
  createStudent,
  getClasses,
  registerFaces,
} from "../api/studentApi";
import type { FaceRegistrationSummary } from "../api/studentApi";

import type {
  SchoolClass,
  StudentCreatePayload,
  Student,
} from "../types";

type Step = "details" | "photos" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "photos", label: "Photos" },
  { key: "done", label: "Done" },
];

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="stepper">
      {STEPS.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;
        return (
          <div
            key={step.key}
            className={`step${isActive ? " step--active" : ""}${isDone ? " step--done" : ""}`}
          >
            <div className="step__circle">
              {isDone ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                idx + 1
              )}
            </div>
            <span className="step__label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentRegistration() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  const [step, setStep] = useState<Step>("details");
  const [createdStudent, setCreatedStudent] = useState<Student | null>(null);
  const [faceSummary, setFaceSummary] = useState<FaceRegistrationSummary | null>(null);
  const [isRegisteringFaces, setIsRegisteringFaces] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);

  useEffect(() => {
    getClasses()
      .then(setClasses)
      .finally(() => setIsLoadingClasses(false));
  }, []);

  async function handleStudentCreate(payload: StudentCreatePayload) {
    const student = await createStudent(payload);
    setCreatedStudent(student);
    setStep("photos");
  }

  async function handlePhotosReady(files: File[]) {
    if (!createdStudent) return;
    setFaceError(null);
    setIsRegisteringFaces(true);
    try {
      const summary = await registerFaces(createdStudent.id, files);
      setFaceSummary(summary);
      setStep("done");
    } catch (err: any) {
      setFaceError(err?.response?.data?.detail || "Failed to register faces");
    } finally {
      setIsRegisteringFaces(false);
    }
  }

  return (
    <Layout>
      <div className="registration-page">
        <Stepper current={step} />

        {step === "details" && (
          <div className="reg-card" key="details">
            <div className="reg-card__header">
              <h1 className="reg-card__title">Register New Student</h1>
              <p className="reg-card__subtitle">
                Enter the student's basic information to get started.
              </p>
            </div>

            {isLoadingClasses ? (
              <Loader label="Loading classes..." />
            ) : (
              <StudentForm
                classes={classes}
                onSubmit={handleStudentCreate}
                submitLabel="Next: Add Photos →"
              />
            )}
          </div>
        )}

        {step === "photos" && createdStudent && (
          <div className="reg-card" key="photos">
            <div className="reg-card__header">
              <h2 className="reg-card__title">
                Upload Face Photos
              </h2>
              <p className="reg-card__subtitle">
                Upload <strong>15–30 clear, well-lit photos</strong> of{" "}
                <strong>{createdStudent.name}</strong> ({createdStudent.roll_number}). One face per
                photo, from slightly different angles for best accuracy.
              </p>
            </div>

            {faceError && <div className="error-banner">{faceError}</div>}

            {isRegisteringFaces ? (
              <Loader label="Processing photos… this can take a minute" />
            ) : (
              <PhotoCaptureGrid onFilesReady={handlePhotosReady} />
            )}
          </div>
        )}

        {step === "done" && faceSummary && (
          <div className="reg-card" key="done">
            <div className="success-state">
              <div className="success-state__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <h2 className="success-state__title">Registration Complete</h2>
              <p className="success-state__subtitle">
                {createdStudent?.name} has been successfully registered with face recognition.
              </p>

              <div className="success-stats">
                <div className="success-stat">
                  <span className="success-stat__value success-stat__value--success">
                    {faceSummary.successful}
                  </span>
                  <span className="success-stat__label">Successful</span>
                </div>
                <div className="success-stat">
                  <span className="success-stat__value">{faceSummary.total_uploaded}</span>
                  <span className="success-stat__label">Total</span>
                </div>
                <div className="success-stat">
                  <span className={`success-stat__value${faceSummary.failed > 0 ? " success-stat__value--fail" : ""}`}>
                    {faceSummary.failed}
                  </span>
                  <span className="success-stat__label">Skipped</span>
                </div>
              </div>

              {faceSummary.failed > 0 && (
                <div className="face-issue-list">
                  <p className="face-issue-list__title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Photos that were skipped
                  </p>
                  <ul>
                    {faceSummary.results
                      .filter((r) => r.status === "failed")
                      .map((r) => (
                        <li key={r.filename}>
                          <strong>{r.filename}</strong> — {r.reason}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <div className="button-row">
                <button className="btn btn-primary" onClick={() => navigate("/students")}>
                  Go to Student List
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setStep("details");
                    setCreatedStudent(null);
                    setFaceSummary(null);
                    setFaceError(null);
                  }}
                >
                  Register Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}