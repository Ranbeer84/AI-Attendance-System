import axiosInstance from "./axiosInstance";
import type { AttendanceRecord, AttendanceStatus, JobStatus } from "../types";

export interface UploadPhotoResponse {
  job_id: string;
  status: string;
}

export async function uploadGroupPhoto(file: File, classId?: string): Promise<UploadPhotoResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (classId) formData.append("class_id", classId);

  const response = await axiosInstance.post<UploadPhotoResponse>("/attendance/upload-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await axiosInstance.get<JobStatus>(`/attendance/status/${jobId}`);
  return response.data;
}

export interface AttendanceRecordInput {
  student_id: string;
  status: AttendanceStatus;
  confidence?: number | null;
}

export interface ConfirmAttendancePayload {
  class_id: string;
  subject_id?: string | null;
  date?: string | null;
  source_photo_url?: string | null;
  records: AttendanceRecordInput[];
}

export interface ConfirmAttendanceResponse {
  class_id: string;
  subject_id: string | null;
  date: string;
  total_records: number;
  records: AttendanceRecord[];
}

export async function confirmAttendance(
  payload: ConfirmAttendancePayload
): Promise<ConfirmAttendanceResponse> {
  const response = await axiosInstance.post<ConfirmAttendanceResponse>("/attendance/confirm", payload);
  return response.data;
}

export interface AttendanceHistoryFilters {
  class_id?: string;
  subject_id?: string;
  student_id?: string;
  date_from?: string;
  date_to?: string;
}

export async function getAttendanceHistory(
  filters: AttendanceHistoryFilters
): Promise<AttendanceRecord[]> {
  const response = await axiosInstance.get<AttendanceRecord[]>("/attendance/history", {
    params: filters,
  });
  return response.data;
}