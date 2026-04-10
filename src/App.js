import { useEffect, useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import SignUpPage from "./pages/Public/SignUpPage";
import CoachSignUpPage from "./pages/Public/CoachSignUpPage";
import RefSignUpPage from "./pages/Public/RefSignUpPage";
import SignUpSelectPage from "./pages/Public/SignUpSelectPage";

// ✅ NEW IMPORT
import TeamSchedulesPage from "./pages/Public/TeamSchedulesPage";

import Dashboard from "./pages/Admin/Dashboard";
import LoginModal from "./components/LoginModal";

import { supabase } from "./supabase";
import logo from "./resources/logo.png";

export default function App() {
  const [page, setPage] = useState("home");
  const [adminPage, setAdminPage] = useState("dashboard");

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/admin")) {
      checkAdmin();
    }

    if (path.includes("/signup")) setPage("signupSelect");
    if (path.includes("/coach-signup")) setPage("coachSignup");
    if (path.includes("/ref-signup")) setPage("refSignup");
  }, []);

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setPage("adminLogin");
    } else {
      setPage("dashboard");
    }
  };

  return (
    <>
      {/* 🔐 ADMIN LOGIN */}
      {page === "adminLogin" && (
        <LoginModal />
      )}

      {/* 🛠 ADMIN DASHBOARD */}
      {page === "dashboard" && (
        <div
          style={{
            width: "100vw",
            height: "100vh",
            background: "#f8fafc",
          }}
        >
          <Dashboard
            adminPage={adminPage}
            setAdminPage={setAdminPage}
          />
        </div>
      )}

      {/* 🌐 PUBLIC APP */}
      {page !== "dashboard" && page !== "adminLogin" && (
        <div className="app">

          {/* HEADER */}
          <div className="header">
            <img src={logo} className="logo" alt="logo" />
          </div>

          {/* PUBLIC PAGES */}
          {page === "home" && <HomePage setPage={setPage} />}

          {/* ✅ FIXED */}
          {page === "schedule" && <SchedulePage setPage={setPage} />}

          {page === "scoreboard" && <ScoreboardPage />}

          {/* ✅ NEW PAGE */}
          {page === "teamSchedules" && (
            <TeamSchedulesPage setPage={setPage} />
          )}

          {/* SIGNUPS */}
          {page === "signupSelect" && <SignUpSelectPage setPage={setPage} />}
          {page === "signup" && <SignUpPage />}
          {page === "coachSignup" && <CoachSignUpPage />}
          {page === "refSignup" && <RefSignUpPage />}

          {/* NAV */}
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
              className={`nav-btn ${page === "scoreboard" ? "active" : ""}`}
              onClick={() => setPage("scoreboard")}
            >
              Scores
            </button>

            <button
              className={`nav-btn ${page === "signupSelect" ? "active" : ""}`}
              onClick={() => setPage("signupSelect")}
            >
              Sign Up
            </button>

          </div>

        </div>
      )}
    </>
  );
}
