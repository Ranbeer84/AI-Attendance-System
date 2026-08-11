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

      <div className="form-group">
        <label className="form-label" htmlFor="student-name">
          Full Name
        </label>
        <input
          id="student-name"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="student-roll">
          Roll Number
        </label>
        <input
          id="student-roll"
          className="form-input"
          value={rollNumber}
          onChange={(e) => setRollNumber(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="student-email">
          Email (optional)
        </label>
        <input
          id="student-email"
          type="email"
          className="form-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="student-class">
          Class
        </label>
        <select
          id="student-class"
          className="form-input"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">-- No class --</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section ? `- ${c.section}` : ""}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}