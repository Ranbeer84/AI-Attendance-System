import axiosInstance from "./axiosInstance";
import type { Student, StudentCreatePayload, SchoolClass, Subject } from "../types";

export async function getStudents(classId?: string): Promise<Student[]> {
  const response = await axiosInstance.get<Student[]>("/students", {
    params: classId ? { class_id: classId } : undefined,
  });
  return response.data;
}

export async function getStudent(studentId: string): Promise<Student> {
  const response = await axiosInstance.get<Student>(`/students/${studentId}`);
  return response.data;
}

export async function createStudent(payload: StudentCreatePayload): Promise<Student> {
  const response = await axiosInstance.post<Student>("/students", payload);
  return response.data;
}

export async function updateStudent(
  studentId: string,
  payload: Partial<StudentCreatePayload>
): Promise<Student> {
  const response = await axiosInstance.put<Student>(`/students/${studentId}`, payload);
  return response.data;
}

export async function deleteStudent(studentId: string): Promise<void> {
  await axiosInstance.delete(`/students/${studentId}`);
}

export async function uploadProfilePhoto(studentId: string, file: File): Promise<Student> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosInstance.post<Student>(`/students/${studentId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export interface FaceRegistrationResult {
  filename: string;
  status: "success" | "failed";
  reason: string | null;
  embedding_id: string | null;
}

export interface FaceRegistrationSummary {
  student_id: string;
  total_uploaded: number;
  successful: number;
  failed: number;
  results: FaceRegistrationResult[];
}

export async function registerFaces(studentId: string, files: File[]): Promise<FaceRegistrationSummary> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await axiosInstance.post<FaceRegistrationSummary>(
    `/students/${studentId}/register-face`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}

export async function getClasses(): Promise<SchoolClass[]> {
  const response = await axiosInstance.get<SchoolClass[]>("/classes");
  return response.data;
}

export async function getSubjects(): Promise<Subject[]> {
  const response = await axiosInstance.get<Subject[]>("/subjects");
  return response.data;
}