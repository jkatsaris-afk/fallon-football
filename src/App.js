import React, { useState } from "react";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import TeamsPage from "./pages/Public/TeamsPage";

import AdminDashboard from "./pages/Admin/Dashboard";
import CoachDashboard from "./pages/Coach/CoachDashboard";
import ParentDashboard from "./pages/Parent/ParentDashboard";

import "./styles.css";

export default function App() {
  const [role, setRole] = useState("public");
  const [page, setPage] = useState("home");

  return (
    <div>

      {/* HEADER */}
      <div className="header">
        Fallon Flag Football
      </div>

      {/* ROLE SWITCH (TEMP) */}
      <div className="nav">
        <button onClick={() => setRole("public")}>Public</button>
        <button onClick={() => setRole("admin")}>Admin</button>
        <button onClick={() => setRole("coach")}>Coach</button>
        <button onClick={() => setRole("parent")}>Parent</button>
      </div>

      <div className="page">

        {/* PUBLIC */}
        {role === "public" && (
          <>
            <div className="nav">
              <button onClick={() => setPage("home")}>Home</button>
              <button onClick={() => setPage("schedule")}>Schedule</button>
              <button onClick={() => setPage("teams")}>Teams</button>
            </div>

            {page === "home" && <HomePage />}
            {page === "schedule" && <SchedulePage />}
            {page === "teams" && <TeamsPage />}
          </>
        )}

        {/* ADMIN */}
        {role === "admin" && <AdminDashboard />}

        {/* COACH */}
        {role === "coach" && <CoachDashboard />}

        {/* PARENT */}
        {role === "parent" && <ParentDashboard />}

      </div>
    </div>
  );
}
