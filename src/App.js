import { useEffect, useState } from "react";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import SignUpPage from "./pages/Public/SignUpPage";
import CoachSignUpPage from "./pages/Public/CoachSignUpPage";
import RefSignUpPage from "./pages/Public/RefSignUpPage";
import SignUpSelectPage from "./pages/Public/SignUpSelectPage";
import TeamSchedulesPage from "./pages/Public/TeamSchedulesPage";

// 🔥 LOGIN PAGES
import LoginSelectPage from "./pages/Public/LoginSelectPage";
import CoachLoginPage from "./pages/Public/CoachLoginPage";
import RefLoginPage from "./pages/Ref/RefLogin";
import ParentLoginPage from "./pages/Public/ParentLoginPage";

// 🔥 REF APP
import RefLayout from "./layouts/RefLayout";
import RefDashboard from "./pages/Ref/RefDashboard";
import RefSchedule from "./pages/Ref/RefSchedule";
import RefTime from "./pages/Ref/RefTime";
import RefProfile from "./pages/Ref/RefProfile";

import Dashboard from "./pages/Admin/Dashboard";
import LoginModal from "./components/LoginModal";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";

import { supabase } from "./supabase";

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

    if (path.includes("/login")) setPage("loginSelect");

    // 🔥 FIXED REF ROUTING
    if (
      (path === "/ref" || path.startsWith("/ref")) &&
      !path.includes("ref-signup") &&
      !path.includes("ref-login")
    ) {
      setPage("refDashboard");
    }

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
      {page === "adminLogin" && <LoginModal />}

      {/* 🛠 ADMIN DASHBOARD */}
      {page === "dashboard" && (
        <AdminLayout
          adminPage={adminPage}
          setAdminPage={setAdminPage}
        >
          <Dashboard
            adminPage={adminPage}
            setAdminPage={setAdminPage}
          />
        </AdminLayout>
      )}

      {/* 🔥 REF APP */}
      {page.startsWith("ref") &&
        page !== "refLogin" &&
        page !== "refSignup" && ( // 🔥 IMPORTANT FIX
        <RefLayout page={page} setPage={setPage}>

          {page === "refDashboard" && <RefDashboard />}
          {page === "refSchedule" && <RefSchedule />}
          {page === "refTime" && <RefTime />}
          {page === "refProfile" && <RefProfile />}

        </RefLayout>
      )}

      {/* 🌐 PUBLIC APP */}
      {page !== "dashboard" &&
        page !== "adminLogin" &&
        (!page.startsWith("ref") ||
          page === "refLogin" ||
          page === "refSignup") && ( // 🔥 IMPORTANT FIX
        <PublicLayout page={page} setPage={setPage}>

          {page === "home" && <HomePage setPage={setPage} />}

          {page === "schedule" && (
            <SchedulePage setPage={setPage} />
          )}

          {page === "scoreboard" && <ScoreboardPage />}

          {page === "teamSchedules" && (
            <TeamSchedulesPage setPage={setPage} />
          )}

          {/* 🔥 LOGIN FLOW */}
          {page === "loginSelect" && (
            <LoginSelectPage setPage={setPage} />
          )}

          {page === "coachLogin" && <CoachLoginPage />}
          {page === "refLogin" && <RefLoginPage setPage={setPage} />}
          {page === "parentLogin" && <ParentLoginPage />}

          {/* SIGNUPS */}
          {page === "signupSelect" && (
            <SignUpSelectPage setPage={setPage} />
          )}

          {page === "signup" && <SignUpPage />}
          {page === "coachSignup" && <CoachSignUpPage />}
          {page === "refSignup" && <RefSignUpPage />}

        </PublicLayout>
      )}
    </>
  );
}
