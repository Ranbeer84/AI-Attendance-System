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
      <h1 className="page-title">Register New Student</h1>

      {step === "details" && (
        <div className="card card-inline">
          {isLoadingClasses ? (
            <Loader label="Loading classes..." />
          ) : (
            <StudentForm classes={classes} onSubmit={handleStudentCreate} submitLabel="Next: Add Photos" />
          )}
        </div>
      )}

      {step === "photos" && createdStudent && (
        <div className="card card-inline">
          <h2 className="section-title">
            Upload face photos for {createdStudent.name} ({createdStudent.roll_number})
          </h2>
          <p className="page-subtitle">
            Upload 15-30 clear, well-lit photos of the student's face, one face per photo, from
            slightly different angles for best recognition accuracy.
          </p>
          {faceError && <div className="error-banner">{faceError}</div>}
          {isRegisteringFaces ? (
            <Loader label="Processing photos... this can take a minute" />
          ) : (
            <PhotoCaptureGrid onFilesReady={handlePhotosReady} />
          )}
        </div>
      )}

      {step === "done" && faceSummary && (
        <div className="card card-inline">
          <h2 className="section-title">Registration Complete</h2>
          <p>
            {faceSummary.successful} of {faceSummary.total_uploaded} photos processed successfully.
          </p>

          {faceSummary.failed > 0 && (
            <div className="face-summary-issues">
              <p className="page-subtitle">Photos that were skipped:</p>
              <ul>
                {faceSummary.results
                  .filter((r) => r.status === "failed")
                  .map((r) => (
                    <li key={r.filename}>
                      {r.filename}: {r.reason}
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
              }}
            >
              Register Another Student
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}