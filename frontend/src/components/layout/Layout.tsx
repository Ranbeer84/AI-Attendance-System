import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Navbar />
      <Sidebar />
      <div className="app-main">
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}