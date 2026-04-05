import { useEffect, useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import SignUpPage from "./pages/Public/SignUpPage";
import CoachSignUpPage from "./pages/Public/CoachSignUpPage";
import RefSignUpPage from "./pages/Public/RefSignUpPage";
import SignUpSelectPage from "./pages/Public/SignUpSelectPage"; // ✅ ADDED

import LoginModal from "./components/LoginModal";
import Dashboard from "./pages/Admin/Dashboard";

import { supabase } from "./supabase";
import logo from "./resources/logo.png";

export default function App() {
  const [page, setPage] = useState("home");

  const [adminPage, setAdminPage] = useState("dashboard");
  const [isAdminAuthed, setIsAdminAuthed] = useState(false); // ✅ ADDED

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/admin")) setPage("dashboard");
    if (path.includes("/sign-up")) setPage("signup");
    if (path.includes("/coach-signup")) setPage("coachSignup");
    if (path.includes("/ref-signup")) setPage("refSignup");
    if (path.includes("/signup")) setPage("signupSelect"); // ✅ ADDED

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setIsAdminAuthed(true);
      } else {
        setIsAdminAuthed(false);
      }
    };

    checkUser();
  }, []);

  return (
    <>
      {/* ================= ADMIN ================= */}
      {page === "dashboard" ? (
        !isAdminAuthed ? (
          <LoginModal onClose={() => setPage("home")} /> // ✅ LOGIN ONLY HERE
        ) : (
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
        )
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
          {page === "signup" && <SignUpPage />}
          {page === "coachSignup" && <CoachSignUpPage />}
          {page === "refSignup" && <RefSignUpPage />}
          {page === "signupSelect" && <SignUpSelectPage setPage={setPage} />} {/* ✅ ADDED */}

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
