import { useEffect, useState } from "react";

import Layout from "../components/layout/Layout";
import Table from "../components/shared/Table";
import type { TableColumn } from "../components/shared/Table";
import Button from "../components/shared/Button";

import { getReport, exportReport } from "../api/reportApi";
import type { ExportFormat } from "../api/reportApi";

import { getClasses } from "../api/studentApi";

import type {
  AttendanceReport,
  SchoolClass,
  StudentAttendanceSummary,
} from "../types";

export default function Reports() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

  useEffect(() => {
    getClasses().then(setClasses);
  }, []);

  useEffect(() => {
    loadReport();
  }, [classId, dateFrom, dateTo]);

  async function loadReport() {
    setIsLoading(true);
    try {
      const data = await getReport({
        class_id: classId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setReport(data);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExport(format: ExportFormat) {
    setIsExporting(format);
    try {
      await exportReport(format, {
        class_id: classId || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
    } finally {
      setIsExporting(null);
    }
  }

  const columns: TableColumn<StudentAttendanceSummary>[] = [
    { header: "Roll No.", accessor: (s) => s.roll_number, width: "100px" },
    { header: "Student", accessor: (s) => s.student_name },
    { header: "Total Sessions", accessor: (s) => s.total_sessions, width: "120px" },
    { header: "Present", accessor: (s) => s.present_count, width: "90px" },
    { header: "Absent", accessor: (s) => s.absent_count, width: "90px" },
    { header: "Late", accessor: (s) => s.late_count, width: "90px" },
    {
      header: "Attendance %",
      accessor: (s) => (
        <span className={s.attendance_percentage < 75 ? "attendance-low" : "attendance-good"}>
          {s.attendance_percentage.toFixed(1)}%
        </span>
      ),
      width: "120px",
    },
  ];

  return (
    <Layout>
      <h1 className="page-title">Attendance Reports</h1>

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

      {report && (
        <div className="report-summary-card">
          <div>
            <span className="summary-label">Total Sessions</span>
            <span className="summary-value">{report.class_summary.total_sessions}</span>
          </div>
          <div>
            <span className="summary-label">Average Attendance</span>
            <span className="summary-value">
              {report.class_summary.average_attendance_percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <div className="button-row">
        <Button variant="secondary" onClick={() => handleExport("pdf")} disabled={isExporting !== null}>
          {isExporting === "pdf" ? "Exporting..." : "Export PDF"}
        </Button>
        <Button variant="secondary" onClick={() => handleExport("excel")} disabled={isExporting !== null}>
          {isExporting === "excel" ? "Exporting..." : "Export Excel"}
        </Button>
        <Button variant="secondary" onClick={() => handleExport("csv")} disabled={isExporting !== null}>
          {isExporting === "csv" ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <Table
        columns={columns}
        data={report?.students || []}
        keyExtractor={(s) => s.student_id}
        isLoading={isLoading}
        emptyMessage="No attendance data for the selected filters."
      />
    </Layout>
  );
}