// Runtime/value imports
import { createContext, useContext, useEffect, useState } from "react";
import { login as loginRequest, getMe } from "../api/authApi";

// Type-only imports
import type { ReactNode } from "react";
import type { LoginRequest, TeacherOut } from "../api/authApi";

interface AuthContextValue {
  teacher: TeacherOut | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [teacher, setTeacher] = useState<TeacherOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, if a token already exists in storage, try to resolve
  // the current teacher so refreshing the page doesn't bounce a logged-in
  // user back to the login screen.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then((data) => setTeacher(data))
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(payload: LoginRequest) {
    const tokens = await loginRequest(payload);
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);

    const currentTeacher = await getMe();
    setTeacher(currentTeacher);
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setTeacher(null);
  }

  const value: AuthContextValue = {
    teacher,
    isLoading,
    isAuthenticated: !!teacher,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}