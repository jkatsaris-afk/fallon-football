import { useEffect, useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import SignUpPage from "./pages/Public/SignUpPage";
import CoachSignUpPage from "./pages/Public/CoachSignUpPage";
import RefSignUpPage from "./pages/Public/RefSignUpPage";

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

    if (path.includes("/sign-up")) setPage("signup");
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
          {page === "schedule" && <SchedulePage />}
          {page === "scoreboard" && <ScoreboardPage />}
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

            {/* 🔥 SIGNUPS BACK */}

            <button
              className={`nav-btn ${page === "signup" ? "active" : ""}`}
              onClick={() => setPage("signup")}
            >
              Sign Up
            </button>

            <button
              className={`nav-btn ${page === "coachSignup" ? "active" : ""}`}
              onClick={() => setPage("coachSignup")}
            >
              Coach
            </button>

            <button
              className={`nav-btn ${page === "refSignup" ? "active" : ""}`}
              onClick={() => setPage("refSignup")}
            >
              Ref
            </button>

          </div>

        </div>
      )}
    </>
  );
}
