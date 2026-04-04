import { useEffect, useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import ScoreboardManager from "./pages/Admin/ScoreboardManager";
import LoginModal from "./components/LoginModal";

import { supabase } from "./supabase";
import logo from "./resources/logo.png";

export default function App() {
  const [page, setPage] = useState("home");
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;

    if (path === "/admin") setPage("admin");

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (path === "/admin" && !data.user) {
        window.location.href = "/";
      }
    };

    checkUser();
  }, []);

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        <img src={logo} className="logo" alt="logo" />
      </div>

      {/* PAGES */}
      {page === "home" && <HomePage setPage={setPage} />}
      {page === "schedule" && <SchedulePage />}
      {page === "scoreboard" && <ScoreboardPage />}
      {page === "admin" && <ScoreboardManager />}

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

        <button onClick={() => setShowLogin(true)} className="nav-btn">
          Login
        </button>

      </div>

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}

    </div>
  );
}
