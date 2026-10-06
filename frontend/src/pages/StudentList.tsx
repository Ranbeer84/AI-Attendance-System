import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Layout from "../components/layout/Layout";
import Table from "../components/shared/Table";
import type { TableColumn } from "../components/shared/Table";
import Modal from "../components/shared/Modal";
import Button from "../components/shared/Button";

import { getStudents, deleteStudent, getClasses } from "../api/studentApi";

import type { Student, SchoolClass } from "../types";

export default function StudentList() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  useEffect(() => {
    getClasses().then(setClasses);
  }, []);

  useEffect(() => {
    loadStudents();
  }, [selectedClassId]);

  async function loadStudents() {
    setIsLoading(true);
    try {
      const data = await getStudents(selectedClassId || undefined);
      setStudents(data);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!studentToDelete) return;
    await deleteStudent(studentToDelete.id);
    setStudentToDelete(null);
    loadStudents();
  }

  const classNameById = (classId: string | null): string => {
    if (!classId) return "-";
    const found = classes.find((c) => c.id === classId);
    return found ? `${found.name}${found.section ? " - " + found.section : ""}` : "-";
  };

  const columns: TableColumn<Student>[] = [
    { header: "Roll No.", accessor: (s) => s.roll_number, width: "100px" },
    {
      header: "Photo",
      accessor: (s) =>
        s.profile_photo_url ? (
          <img src={s.profile_photo_url} alt={s.name} className="table-avatar" />
        ) : (
          <div className="table-avatar table-avatar-placeholder">{s.name.charAt(0)}</div>
        ),
      width: "60px",
    },
    { header: "Name", accessor: (s) => s.name },
    { header: "Class", accessor: (s) => classNameById(s.class_id) },
    { header: "Email", accessor: (s) => s.email || "-" },
    {
      header: "Status",
      accessor: (s) => (
        <span className={`status-badge ${s.is_active ? "status-active" : "status-inactive"}`}>
          {s.is_active ? "Active" : "Inactive"}
        </span>
      ),
      width: "100px",
    },
    {
      header: "Actions",
      accessor: (s) => (
        <button className="link-button link-button-danger" onClick={() => setStudentToDelete(s)}>
          Delete
        </button>
      ),
      width: "80px",
    },
  ];

  return (
    <Layout>
      <div className="page-header-row">
        <h1 className="page-title">Students</h1>
        <Button onClick={() => navigate("/students/register")}>+ Register Student</Button>
      </div>

      <div className="filter-row">
        <select
          className="form-input filter-select"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section ? `- ${c.section}` : ""}
            </option>
          ))}
        </select>
      </div>

      <Table
        columns={columns}
        data={students}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No students found. Register your first student to get started."
      />

      <Modal
        isOpen={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        title="Delete Student"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStudentToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>{studentToDelete?.name}</strong>? This also
          removes their registered face data and cannot be undone.
        </p>
      </Modal>
    </Layout>
  );
}