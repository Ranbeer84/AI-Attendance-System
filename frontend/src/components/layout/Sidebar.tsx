import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    to: "/students",
    label: "Students",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6" strokeLinecap="round" />
        <circle cx="17.5" cy="9" r="2.4" />
        <path d="M15.2 14.2c2.5.2 4.3 2.5 4.3 5.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/students/register",
    label: "Register Student",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3 20c0-3.6 2.7-6.5 6-6.5s6 2.9 6 6.5" strokeLinecap="round" />
        <path d="M18 8v6M15 11h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/attendance/take",
    label: "Take Attendance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="7" width="14" height="12" rx="2.5" />
        <path
          d="M17 10.5l4-2.3v9.6l-4-2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="13" r="2.4" />
      </svg>
    ),
  },
  {
    to: "/attendance/history",
    label: "Attendance History",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8.2" />
        <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20V10M11 20V4M18 20v-7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-logo-mark">A</span>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">AIAS</span>
          <span className="sidebar-brand-sub">Attendance</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " sidebar-link-active" : ""}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-text">Face-recognition attendance</span>
      </div>
    </aside>
  );
}