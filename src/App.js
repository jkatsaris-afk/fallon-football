import { useEffect, useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import SignUpPage from "./pages/Public/SignUpPage"; // ✅ ADDED

import LoginModal from "./components/LoginModal";
import Dashboard from "./pages/Admin/Dashboard";

import { supabase } from "./supabase";
import logo from "./resources/logo.png";

export default function App() {
  const [page, setPage] = useState("home"); // ✅ KEEP THIS EXACT
  const [showLogin, setShowLogin] = useState(false);

  const [adminPage, setAdminPage] = useState("dashboard");

  useEffect(() => {
    const path = window.location.pathname;

    if (path === "/admin") setPage("dashboard");

    if (path === "/sign-up") setPage("signup"); // ✅ ADDED

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (path === "/admin" && !data.user) {
        window.location.href = "/";
      }
    };

    checkUser();
  }, []);

  return (
    <>
      {page === "dashboard" ? (
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
      ) : (
        <div className="app">

          {/* HEADER */}
          <div className="header">
            <img src={logo} className="logo" alt="logo" />
          </div>

          {/* PUBLIC PAGES */}
          {page === "home" && <HomePage setPage={setPage} />}
          {page === "schedule" && <SchedulePage />}
          {page === "scoreboard" && <ScoreboardPage />}
          {page === "signup" && <SignUpPage />} {/* ✅ ADDED */}

          {/* NAV (UNCHANGED) */}
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
              className={`nav-btn ${page === "dashboard" ? "active" : ""}`}
              onClick={() => setPage("dashboard")}
            >
              Admin
            </button>

            <button onClick={() => setShowLogin(true)} className="nav-btn">
              Login
            </button>

          </div>

          {showLogin && (
            <LoginModal onClose={() => setShowLogin(false)} />
          )}

        </div>
      )}
    </>
  );
}
