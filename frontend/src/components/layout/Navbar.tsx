import { useAuth } from "../../context/AuthContext";

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

export default function Navbar() {
  const { teacher, logout } = useAuth();

  return (
    <div className="navbar-dock-wrap">
      <nav className="navbar-dock">
        <div className="navbar-dock-mark">A</div>

        <div className="navbar-dock-divider" />

        <div className="navbar-dock-user">
          <span className="navbar-avatar">{getInitials(teacher?.name)}</span>
          <div className="navbar-dock-user-info">
            <span className="navbar-teacher-name">{teacher?.name || "Teacher"}</span>
            <span className="navbar-teacher-role">PRO</span>
          </div>
        </div>

        <div className="navbar-dock-divider" />

        <button className="navbar-dock-btn" onClick={() => {}}>
          Profile
        </button>

        <button className="navbar-dock-logout" onClick={logout}>
          Log out
        </button>
      </nav>
    </div>
  );
}