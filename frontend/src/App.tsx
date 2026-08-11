import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StudentList from "./pages/StudentList";
import StudentRegistration from "./pages/StudentRegistration";
import TakeAttendance from "./pages/TakeAttendance";
import AttendancePreview from "./pages/AttendancePreview";
import AttendanceHistory from "./pages/AttendanceHistory";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <StudentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/register"
            element={
              <ProtectedRoute>
                <StudentRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/take"
            element={
              <ProtectedRoute>
                <TakeAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/preview/:jobId"
            element={
              <ProtectedRoute>
                <AttendancePreview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/history"
            element={
              <ProtectedRoute>
                <AttendanceHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}