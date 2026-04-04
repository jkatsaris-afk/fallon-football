import { useEffect, useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import SignUpPage from "./pages/Public/SignUpPage";

import AdminSettings from "./pages/Admin/AdminSettings";
import Dashboard from "./pages/Admin/Dashboard";

import LoginModal from "./components/LoginModal";

import { supabase } from "./supabase";
import logo from "./resources/logo.png";

export default function App() {
  const [page, setPage] = useState("home");
  const [adminPage, setAdminPage] = useState("dashboard");
  const [showLogin, setShowLogin] = useState(false);
  const [signupsOpen, setSignupsOpen] = useState(false);

  useEffect(() => {
    loadSettings();

    const path = window.location.pathname;

    if (path === "/admin") setPage("dashboard");
    if (path === "/settings") setAdminPage("settings");

    if (path === "/sign-up") {
      setPage("signup");
    }
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (data) setSignupsOpen(data.signups_open);
  };

  return (
    <>
      {page === "dashboard" ? (
        <div style={{ width: "100vw", height: "100vh" }}>
          {adminPage === "dashboard" && (
            <Dashboard
              adminPage={adminPage}
              setAdminPage={setAdminPage}
            />
          )}

          {adminPage === "settings" && <AdminSettings />}
        </div>
      ) : (
        <div className="app">

          <div className="header">
            <img src={logo} className="logo" alt="logo" />
          </div>

          {page === "home" && <HomePage setPage={setPage} />}
          {page === "schedule" && <SchedulePage />}
          {page === "scoreboard" && <ScoreboardPage />}

          {page === "signup" && signupsOpen && <SignUpPage />}

          {page !== "signup" && (
            <div className="bottom-nav">

              <button onClick={()=>setPage("home")}>Home</button>
              <button onClick={()=>setPage("schedule")}>Schedule</button>
              <button onClick={()=>setPage("scoreboard")}>Scores</button>
              <button onClick={()=>setPage("dashboard")}>Admin</button>
              <button onClick={()=>setShowLogin(true)}>Login</button>

            </div>
          )}

          {showLogin && (
            <LoginModal onClose={()=>setShowLogin(false)} />
          )}

        </div>
      )}
    </>
  );
}
