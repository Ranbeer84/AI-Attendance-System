import { isAxiosError } from "axios";

/**
 * Turns any thrown error into a string that is safe to render in React.
 *
 * FastAPI returns `detail` as a plain string for HTTPException, but as an
 * ARRAY OF OBJECTS for 422 validation errors. Rendering that array directly
 * ({error}) throws "Objects are not valid as a React child" and blanks the page.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;

    if (typeof detail === "string" && detail.trim()) return detail;

    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = Array.isArray(d.loc) ? d.loc.filter((p) => p !== "body").join(".") : "";
          return field ? `${field}: ${d.msg ?? "invalid value"}` : d.msg ?? "invalid value";
        })
        .join("; ");
    }

    if (!err.response) {
      return "Cannot reach the server. Make sure the backend is running on port 8000 and try again.";
    }

    return `${fallback} (server returned ${err.response.status})`;
  }

  return fallback;
}
