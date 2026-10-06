import axiosInstance from "./axiosInstance";
import type { AttendanceReport, DashboardStats } from "../types";

export interface ReportFilters {
  class_id?: string;
  subject_id?: string;
  date_from?: string;
  date_to?: string;
}

export async function getReport(filters: ReportFilters): Promise<AttendanceReport> {
  const response = await axiosInstance.get<AttendanceReport>("/reports", { params: filters });
  return response.data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await axiosInstance.get<DashboardStats>("/reports/dashboard-stats");
  return response.data;
}

export type ExportFormat = "pdf" | "excel" | "csv";

export async function exportReport(format: ExportFormat, filters: ReportFilters): Promise<void> {
  const response = await axiosInstance.get("/reports/export", {
    params: { format, ...filters },
    responseType: "blob",
  });

  const extension = format === "excel" ? "xlsx" : format;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance_report.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}