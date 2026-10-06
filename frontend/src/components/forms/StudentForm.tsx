import { useState } from "react";
import type { FormEvent } from "react";
import type { StudentCreatePayload, SchoolClass } from "../../types";

import Button from "../shared/Button";

interface StudentFormProps {
  classes: SchoolClass[];
  initialValues?: Partial<StudentCreatePayload>;
  onSubmit: (payload: StudentCreatePayload) => Promise<void>;
  submitLabel?: string;
}

const icons = {
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  hash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  building: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  ),
};

export default function StudentForm({
  classes,
  initialValues,
  onSubmit,
  submitLabel = "Save Student",
}: StudentFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [rollNumber, setRollNumber] = useState(initialValues?.roll_number || "");
  const [email, setEmail] = useState(initialValues?.email || "");
  const [classId, setClassId] = useState(initialValues?.class_id || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !rollNumber.trim()) {
      setError("Name and roll number are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        roll_number: rollNumber.trim(),
        email: email.trim() || null,
        class_id: classId || null,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to save student");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="student-form">
      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="student-name">
            Full Name
          </label>
          <div className="form-input-wrap">
            <span className="form-input-wrap__icon">{icons.user}</span>
            <input
              id="student-name"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="student-roll">
            Roll Number
          </label>
          <div className="form-input-wrap">
            <span className="form-input-wrap__icon">{icons.hash}</span>
            <input
              id="student-roll"
              className="form-input"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. R-2024-001"
              required
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="student-email">
          Email <span className="form-label__optional">(optional)</span>
        </label>
        <div className="form-input-wrap">
          <span className="form-input-wrap__icon">{icons.mail}</span>
          <input
            id="student-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@school.edu"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="student-class">
          Class
        </label>
        <div className="form-input-wrap">
          <span className="form-input-wrap__icon">{icons.building}</span>
          <select
            id="student-class"
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

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            Saving…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}