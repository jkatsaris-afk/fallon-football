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

  // 🔥 NEW: ACCESS DENIED STATE
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();

    // 🔥 ADMIN ROUTE
    if (path.includes("/admin")) {
      checkAdmin();
      return;
    }

    // 🔥 REF ROUTE
    if (
      (path === "/ref" || path.startsWith("/ref")) &&
      !path.includes("ref-signup") &&
      !path.includes("ref-login")
    ) {
      checkRef();
      return;
    }

    // 🔥 SIGNUPS
    if (path.includes("/signup")) {
      setPage("signupSelect");
      return;
    }

    if (path.includes("/coach-signup")) {
      setPage("coachSignup");
      return;
    }

    if (path.includes("/ref-signup")) {
      setPage("refSignup");
      return;
    }

    // 🔥 LOGIN
    if (path.includes("/login")) {
      setPage("loginSelect");
      return;
    }

  }, []);

  // 🔥 ADMIN CHECK
  const checkAdmin = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setPage("adminLogin");
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!userData?.is_admin) {
      setAccessDenied(true); // 🔥 NEW
      setPage("home");
      return;
    }

    setPage("dashboard");
  };

  // 🔥 REF CHECK
  const checkRef = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setPage("refLogin");
      return;
    }

    setPage("refDashboard");
  };

  // 🔥 AUTH LISTENER
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (!session) {

          if (page === "dashboard") {
            setPage("adminLogin");
            return;
          }

          if (page.startsWith("ref")) {
            setPage("refLogin");
            return;
          }
        }

      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [page]);

  // 🔥 URL SYNC
  useEffect(() => {
    if (page === "home") window.history.pushState({}, "", "/");
    if (page === "signupSelect") window.history.pushState({}, "", "/signup");
    if (page === "coachSignup") window.history.pushState({}, "", "/coach-signup");
    if (page === "refSignup") window.history.pushState({}, "", "/ref-signup");
    if (page === "loginSelect") window.history.pushState({}, "", "/login");

    if (page === "refDashboard") window.history.pushState({}, "", "/ref");
    if (page === "refSchedule") window.history.pushState({}, "", "/ref/schedule");
    if (page === "refTime") window.history.pushState({}, "", "/ref/time");
    if (page === "refProfile") window.history.pushState({}, "", "/ref/profile");

    if (page === "dashboard") window.history.pushState({}, "", "/admin");

  }, [page]);

  return (
    <>
      {/* 🚫 ACCESS DENIED MODAL */}
      {accessDenied && (
        <AccessDeniedModal onClose={() => setAccessDenied(false)} />
      )}

      {/* 🔐 ADMIN LOGIN */}
      {page === "adminLogin" && (
        <LoginModal setPage={setPage} />
      )}

      {/* 🛠 ADMIN DASHBOARD */}
      {page === "dashboard" && (
        <AdminLayout
          adminPage={adminPage}
          setAdminPage={setAdminPage}
          setPage={setPage}
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
        page !== "refSignup" && (
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
          page === "refSignup") && (
        <PublicLayout page={page} setPage={setPage}>

          {page === "home" && <HomePage setPage={setPage} />}
          {page === "schedule" && <SchedulePage setPage={setPage} />}
          {page === "scoreboard" && <ScoreboardPage />}
          {page === "teamSchedules" && <TeamSchedulesPage setPage={setPage} />}

          {page === "loginSelect" && <LoginSelectPage setPage={setPage} />}
          {page === "coachLogin" && <CoachLoginPage />}
          {page === "refLogin" && <RefLoginPage setPage={setPage} />}
          {page === "parentLogin" && <ParentLoginPage />}

          {page === "signupSelect" && <SignUpSelectPage setPage={setPage} />}
          {page === "signup" && <SignUpPage />}
          {page === "coachSignup" && <CoachSignUpPage />}
          {page === "refSignup" && <RefSignUpPage />}

        </PublicLayout>
      )}
    </>
  );
}

/* 🔥 ACCESS DENIED MODAL */

function AccessDeniedModal({ onClose }) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={{ marginBottom: 10 }}>Access Denied</h2>

        <p style={{ color: "#64748b", marginBottom: 20 }}>
          You do not have access to this area.
        </p>

        <button style={btn} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

/* 🔥 STYLES */

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modal = {
  background: "#fff",
  padding: 24,
  borderRadius: 12,
  width: 320,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
};

const btn = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer"
};
