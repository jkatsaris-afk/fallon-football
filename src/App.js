import React, { useState } from "react";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import TeamsPage from "./pages/Public/TeamsPage";
import LoginPage from "./pages/Auth/LoginPage";

import AdminDashboard from "./pages/Admin/Dashboard";
import CoachDashboard from "./pages/Coach/CoachDashboard";
import ParentDashboard from "./pages/Parent/ParentDashboard";

import "./styles.css";

export default function App() {
  const [page, setPage] = useState("home");
  const [role, setRole] = useState("public");
  const [showLogin, setShowLogin] = useState(false);

  // 🔁 PAGE RENDER LOGIC
  const renderPage = () => {
    // LOGIN PAGE
    if (showLogin) {
      return (
        <LoginPage
          setRole={setRole}
          setShowLogin={setShowLogin}
        />
      );
    }

    // ROLE DASHBOARDS
    if (role === "admin") return <AdminDashboard />;
    if (role === "coach") return <CoachDashboard />;
    if (role === "parent") return <ParentDashboard />;

    // PUBLIC PAGES
    if (page === "home") return <HomePage />;
    if (page === "schedule") return <SchedulePage />;
    if (page === "teams") return <TeamsPage />;
  };

  return (
    <div className="app">

      {/* HEADER */}
      <div
        className="header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>Fallon Flag Football</div>

        <button
          className="icon-btn"
          onClick={() => setShowLogin(true)}
        >
          Login
        </button>
      </div>

      {/* MAIN CONTENT */}
      {renderPage()}

      {/* CLEAN FLOATING NAV */}
      {role === "public" && !showLogin && (
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
