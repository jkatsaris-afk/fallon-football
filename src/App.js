import React, { useState } from "react";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import TeamsPage from "./pages/Public/TeamsPage";

import AdminDashboard from "./pages/Admin/Dashboard";
import CoachDashboard from "./pages/Coach/CoachDashboard";
import ParentDashboard from "./pages/Parent/ParentDashboard";

import "./styles.css";

export default function App() {
  const [page, setPage] = useState("home");
  const [role, setRole] = useState("public");

  const renderPage = () => {
    if (role === "admin") return <AdminDashboard />;
    if (role === "coach") return <CoachDashboard />;
    if (role === "parent") return <ParentDashboard />;

    if (page === "home") return <HomePage />;
    if (page === "schedule") return <SchedulePage />;
    if (page === "teams") return <TeamsPage />;
  };

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        Fallon Football
      </div>

      {/* ROLE SELECT (CLEAN) */}
      <div style={{ padding: "0 15px" }}>
        <div className="card" style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setRole("public")} className="nav-btn">Public</button>
          <button onClick={() => setRole("coach")} className="nav-btn">Coach</button>
          <button onClick={() => setRole("parent")} className="nav-btn">Parent</button>
          <button onClick={() => setRole("admin")} className="nav-btn">Admin</button>
        </div>
      </div>

      {/* PAGE CONTENT */}
      {renderPage()}

      {/* BOTTOM NAV (ONLY PUBLIC FOR NOW) */}
      {role === "public" && (
        <div className="bottom-nav">
          <button
            className={`nav-btn ${page === "home" ? "active" : ""}`}
            onClick={() => setPage("home")}
          >
            Home
          </button>

          <button
            className={`nav-btn ${page === "schedule" ? "active" : ""}`}
            onClick={() => setPage("schedule")}
          >
            Schedule
          </button>

          <button
            className={`nav-btn ${page === "teams" ? "active" : ""}`}
            onClick={() => setPage("teams")}
          >
            Teams
          </button>
        </div>
      )}

    </div>
  );
}
