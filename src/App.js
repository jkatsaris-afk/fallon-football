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

  const [accessDenied, setAccessDenied] = useState(false);

  // 🔥 NEW: INSTALL PROMPT STATE
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // 🔥 CAPTURE INSTALL EVENT
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // 🔥 INSTALL FUNCTION
  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
  };

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/admin")) {
      checkAdmin();
      return;
    }

    if (
      (path === "/ref" || path.startsWith("/ref")) &&
      !path.includes("ref-signup") &&
      !path.includes("ref-login")
    ) {
      checkRef();
      return;
    }

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

    if (path.includes("/login")) {
      setPage("loginSelect");
      return;
    }

  }, []);

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
      setAccessDenied(true);
      setPage("home");
      return;
    }

    setPage("dashboard");
  };

  const checkRef = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      setPage("refLogin");
      return;
    }

    setPage("refDashboard");
  };

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
      {/* 🚫 ACCESS DENIED */}
      {accessDenied && (
        <AccessDeniedModal onClose={() => setAccessDenied(false)} />
      )}

      {/* 🔥 INSTALL BUTTON */}
      {deferredPrompt && (
        <button style={installBtn} onClick={installApp}>
          Add to Home Screen
        </button>
      )}

      {page === "adminLogin" && <LoginModal setPage={setPage} />}

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

/* 🔥 MODAL + STYLES */

function AccessDeniedModal({ onClose }) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>Access Denied</h2>
        <p>You do not have access to this area.</p>
        <button style={btn} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

const installBtn = {
  position: "fixed",
  bottom: 20,
  right: 20,
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600,
  zIndex: 999
};

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const modal = {
  background: "#fff",
  padding: 24,
  borderRadius: 12
};

const btn = {
  padding: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 8
};
