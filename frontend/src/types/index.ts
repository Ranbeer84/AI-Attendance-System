export interface Teacher {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  section: string | null;
  created_at: string;
  subjects: Subject[];
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  email: string | null;
  class_id: string | null;
  profile_photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentCreatePayload {
  name: string;
  roll_number: string;
  email?: string | null;
  class_id?: string | null;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string | null;
  date: string;
  status: AttendanceStatus;
  confidence: number | null;
  source_photo_url: string | null;
  marked_by_teacher_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetectedFace {
  bbox: number[];
  det_score: number;
  status: "matched" | "unknown";
  student_id: string | null;
  student_name: string | null;
  confidence: number | null;
}

export interface GroupPhotoResult {
  source_photo_url: string | null;
  class_id: string | null;
  total_faces_detected: number;
  faces: DetectedFace[];
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  result: GroupPhotoResult | null;
  error: string | null;
}

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  roll_number: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_percentage: number;
}

export interface AttendanceReport {
  filters: {
    class_id: string | null;
    subject_id: string | null;
    date_from: string | null;
    date_to: string | null;
  };
  class_summary: {
    class_id: string | null;
    class_name: string | null;
    total_sessions: number;
    average_attendance_percentage: number;
  };
  students: StudentAttendanceSummary[];
}

export interface DashboardStats {
  total_students: number;
  total_classes: number;
  sessions_today: number;
  average_attendance_percentage_last_30_days: number;
  attendance_trend: { date: string; percentage: number }[];
}

export interface ClassAttendanceBreakdown {
  class_id: string;
  class_name: string;
  average_attendance_percentage: number;
  total_students: number;
}

export interface DashboardStats {
  total_students: number;
  total_classes: number;
  sessions_today: number;
  average_attendance_percentage_last_30_days: number;
  attendance_trend: { date: string; percentage: number }[];
  class_breakdown: ClassAttendanceBreakdown[];
}