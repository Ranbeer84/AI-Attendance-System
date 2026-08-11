import { useState } from "react";
import type { FormEvent } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AxiosError } from "axios";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from || "/dashboard";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      const detail = axiosError.response?.data?.detail;
      setError(detail || "Incorrect email or password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <aside className="login-visual" aria-hidden="true">
        <div className="login-visual__pattern" />

        <div className="login-visual__top">
          <span className="login-wordmark">AIAS</span>
          <span className="login-tagline">Photo in. Attendance out.</span>
        </div>

        <div className="face-reticle">
          <span className="face-reticle__corner face-reticle__corner--tl" />
          <span className="face-reticle__corner face-reticle__corner--tr" />
          <span className="face-reticle__corner face-reticle__corner--bl" />
          <span className="face-reticle__corner face-reticle__corner--br" />
          <span className="face-reticle__scanline" />
          <span className="face-reticle__status">Scanning</span>
        </div>

        <div className="login-chips">
          <span className="login-chip">
            <strong>Detector</strong> RetinaFace
          </span>
          <span className="login-chip">
            <strong>Embedding</strong> ArcFace · 512-d
          </span>
          <span className="login-chip">
            <strong>Index</strong> pgvector · cosine
          </span>
          <span className="login-chip login-chip--ready">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Ready
          </span>
        </div>
      </aside>

      <main className="login-form-panel">
        <div className="login-form-card-wrap">
          <div className="login-form-card">
            <span className="login-eyebrow">Teacher sign in</span>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">
              Sign in to take attendance for your classes.
            </p>

            {error && (
              <div className="login-alert login-alert--error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5" strokeLinecap="round" />
                  <path d="M12 16h.01" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email
                </label>
                <div className="login-input-wrap">
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    placeholder="you@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className="login-input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="5" width="18" height="14" rx="2.5" />
                      <path d="M4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div className="login-input-wrap">
                  <input
                    id="password"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span className="login-input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" />
                      <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" strokeLinecap="round" />
                    </svg>
                  </span>
                </div>
              </div>

              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}