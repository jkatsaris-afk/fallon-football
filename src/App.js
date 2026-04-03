import React, { useState } from "react";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import TeamsPage from "./pages/Public/TeamsPage";

import AdminDashboard from "./pages/Admin/Dashboard";
import CoachDashboard from "./pages/Coach/CoachDashboard";
import ParentDashboard from "./pages/Parent/ParentDashboard";

export default function App() {
  const [role, setRole] = useState("public");
  const [page, setPage] = useState("home");

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setRole("public")}>Public</button>
        <button onClick={() => setRole("admin")}>Admin</button>
        <button onClick={() => setRole("coach")}>Coach</button>
        <button onClick={() => setRole("parent")}>Parent</button>
      </div>

      {role === "public" && (
        <>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("schedule")}>Schedule</button>
          <button onClick={() => setPage("teams")}>Teams</button>

          {page === "home" && <HomePage />}
          {page === "schedule" && <SchedulePage />}
          {page === "teams" && <TeamsPage />}
        </>
      )}

      {role === "admin" && <AdminDashboard />}
      {role === "coach" && <CoachDashboard />}
      {role === "parent" && <ParentDashboard />}
    </div>
  );
}
