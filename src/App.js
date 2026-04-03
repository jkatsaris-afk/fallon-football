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

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        Fallon Football
      </div>

      {/* TEMP ROLE SWITCH */}
      <div style={{ padding: 10 }}>
        <button onClick={() => setRole("public")}>Public</button>
        <button onClick={() => setRole("admin")}>Admin</button>
        <button onClick={() => setRole("coach")}>Coach</button>
        <button onClick={() => setRole("parent")}>Parent</button>
      </div>

      {/* PUBLIC */}
      {role === "public" && (
        <>
          {page === "home" && <HomePage />}
          {page === "schedule" && <SchedulePage />}
          {page === "teams" && <TeamsPage />}

          <div className="bottom-nav">
            <button onClick={() => setPage("home")}>Home</button>
            <button onClick={() => setPage("schedule")}>Schedule</button>
            <button onClick={() => setPage("teams")}>Teams</button>
          </div>
        </>
      )}

      {/* ADMIN */}
      {role === "admin" && <AdminDashboard />}

      {/* COACH */}
      {role === "coach" && <CoachDashboard />}

      {/* PARENT */}
      {role === "parent" && <ParentDashboard />}

    </div>
  );
}
