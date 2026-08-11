import axiosInstance from "./axiosInstance";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TeacherOut {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const response = await axiosInstance.post<TokenResponse>("/auth/login", payload);
  return response.data;
}

export async function getMe(): Promise<TeacherOut> {
  const response = await axiosInstance.get<TeacherOut>("/auth/me");
  return response.data;
}