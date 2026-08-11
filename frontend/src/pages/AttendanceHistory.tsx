import { useEffect, useState } from "react";

import Layout from "../components/layout/Layout";
import Table from "../components/shared/Table";
import type { TableColumn } from "../components/shared/Table";

import { getAttendanceHistory } from "../api/attendanceApi";
import { getClasses, getStudents } from "../api/studentApi";

import type { AttendanceRecord, SchoolClass, Student } from "../types";

export default function AttendanceHistory() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getClasses().then(setClasses);
    getStudents().then(setStudents);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [classId, dateFrom, dateTo]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const data = await getAttendanceHistory({
        class_id: classId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setRecords(data);
    } finally {
      setIsLoading(false);
    }
  }

  const studentNameById = (id: string): string => {
    const found = students.find((s) => s.id === id);
    return found ? `${found.name} (${found.roll_number})` : id;
  };

  const columns: TableColumn<AttendanceRecord>[] = [
    { header: "Date", accessor: (r) => r.date, width: "110px" },
    { header: "Student", accessor: (r) => studentNameById(r.student_id) },
    {
      header: "Status",
      accessor: (r) => <span className={`status-badge status-${r.status}`}>{r.status}</span>,
      width: "100px",
    },
    {
      header: "Confidence",
      accessor: (r) => (r.confidence !== null ? `${(r.confidence * 100).toFixed(1)}%` : "manual"),
      width: "100px",
    },
    { header: "Marked At", accessor: (r) => new Date(r.created_at).toLocaleString(), width: "180px" },
  ];

  return (
    <Layout>
      <h1 className="page-title">Attendance History</h1>

      <div className="filter-row">
        <select className="form-input filter-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section ? `- ${c.section}` : ""}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="form-input filter-select"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="form-input filter-select"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      <Table
        columns={columns}
        data={records}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No attendance records found for the selected filters."
      />
    </Layout>
  );
}