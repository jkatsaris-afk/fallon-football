import { useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import LoginModal from "./components/LoginModal";

export default function App() {
  const [page, setPage] = useState("home");
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        <img src="/logo.png" className="logo" alt="Fallon Flag Football" />
      </div>

      {/* PAGE CONTENT */}
      {page === "home" && <HomePage setPage={setPage} />}
      {page === "schedule" && <SchedulePage />}

      {/* NAVIGATION */}
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
          className="nav-btn"
          onClick={() => setShowLogin(true)}
        >
          Login
        </button>

      </div>

      {/* LOGIN MODAL */}
      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} />
      )}

    </div>
  );
}
