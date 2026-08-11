import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Loader from "../components/shared/Loader";
import Button from "../components/shared/Button";
import Reveal from "../components/shared/Reveal";
import { AttendanceTrendChart, ClassBreakdownChart } from "../components/charts/AttendanceChart";
import { getDashboardStats } from "../api/reportApi";
import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";
import type { DashboardStats } from "../types";

const StatIcon = ({ type }: { type: "students" | "classes" | "sessions" | "attendance" }) => {
  const icons = {
    students: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    classes: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
    sessions: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
        <path d="M8 14h.01" />
        <path d="M12 14h.01" />
        <path d="M16 14h.01" />
        <path d="M8 18h.01" />
        <path d="M12 18h.01" />
      </svg>
    ),
    attendance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  };
  return <div className="stat-card-icon">{icons[type]}</div>;
};

export default function Dashboard() {
  const { teacher } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((err) => setError(err?.response?.data?.detail || "Failed to load dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-hero">
        <span className="page-hero-eyebrow">Dashboard</span>
        <h1 className="page-hero-title">Welcome back, {teacher?.name}</h1>
        <p className="page-hero-subtitle">
          Here's how attendance is looking across your school.
        </p>
        <Button onClick={() => navigate("/attendance/take")}>+ Take Attendance</Button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <Loader label="Loading dashboard..." fullScreen={false} />
      ) : stats ? (
        <>
          <div className="stat-cards-row">
            <Reveal delay={0}>
              <div className="stat-card">
                <StatIcon type="students" />
                <span className="summary-label">Total Students</span>
                <span className="summary-value">{stats.total_students}</span>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <div className="stat-card">
                <StatIcon type="classes" />
                <span className="summary-label">Total Classes</span>
                <span className="summary-value">{stats.total_classes}</span>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="stat-card">
                <StatIcon type="sessions" />
                <span className="summary-label">Sessions Today</span>
                <span className="summary-value">{stats.sessions_today}</span>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="stat-card">
                <StatIcon type="attendance" />
                <span className="summary-label">Avg. Attendance (30d)</span>
                <span className="summary-value">
                  {stats.average_attendance_percentage_last_30_days.toFixed(1)}%
                </span>
              </div>
            </Reveal>
          </div>

          <div className="chart-grid">
            <Reveal delay={0}>
              <div className="card chart-card">
                <h2 className="section-title">Attendance Trend (Last 30 Days)</h2>
                {stats.attendance_trend.length > 0 ? (
                  <AttendanceTrendChart data={stats.attendance_trend} />
                ) : (
                  <p className="page-subtitle">No attendance data recorded yet.</p>
                )}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="card chart-card">
                <h2 className="section-title">Attendance by Class (Last 30 Days)</h2>
                {stats.class_breakdown.length > 0 ? (
                  <ClassBreakdownChart data={stats.class_breakdown} />
                ) : (
                  <p className="page-subtitle">No class attendance data recorded yet.</p>
                )}
              </div>
            </Reveal>
          </div>

          {stats.class_breakdown.length > 0 && (
            <Reveal delay={0}>
              <div className="card">
                <h2 className="section-title">Class Summary</h2>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Students</th>
                        <th>Avg. Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.class_breakdown.map((c) => (
                        <tr key={c.class_id}>
                          <td>{c.class_name}</td>
                          <td>{c.total_students}</td>
                          <td>
                            <span
                              className={
                                c.average_attendance_percentage < 75
                                  ? "attendance-badge attendance-low"
                                  : "attendance-badge attendance-good"
                              }
                            >
                              {c.average_attendance_percentage.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          )}
        </>
      ) : null}
    </Layout>
  );
}