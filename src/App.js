import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./styles.css";

import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";
import ScoreboardPage from "./pages/Public/ScoreboardPage";
import SignUpPage from "./pages/Public/SignUpPage";
import CoachSignUpPage from "./pages/Public/CoachSignUpPage";
import RefSignUpPage from "./pages/Public/RefSignUpPage";
import SignUpSelectPage from "./pages/Public/SignUpSelectPage";
import TeamSchedulesPage from "./pages/Public/TeamSchedulesPage";

// LOGIN
import LoginSelectPage from "./pages/Public/LoginSelectPage";
import CoachLoginPage from "./pages/Public/CoachLoginPage";
import RefLoginPage from "./pages/Ref/RefLogin";
import ParentLoginPage from "./pages/Public/ParentLoginPage";

// REF APP
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

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSInstall, setShowIOSInstall] = useState(false);

  /* ================= INSTALL ================= */

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone = window.navigator.standalone;

    if (isIOS && !isStandalone) {
      setShowIOSInstall(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
  };

  /* ================= 🔥 SESSION RESTORE (NEW) ================= */

  useEffect(() => {
    const restoreSession = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (session?.user) {
        const path = window.location.pathname.toLowerCase();

        if (path.startsWith("/ref")) {
          setPage("refDashboard");
        }

        if (path.startsWith("/admin")) {
          setPage("dashboard");
        }
      }
    };

    restoreSession();
  }, []);

  /* ================= ROUTING ================= */

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

    if (path.includes("/signup")) return setPage("signupSelect");
    if (path.includes("/coach-signup")) return setPage("coachSignup");
    if (path.includes("/ref-signup")) return setPage("refSignup");
    if (path.includes("/login")) return setPage("loginSelect");

  }, []);

  /* ================= AUTH ================= */

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) return setPage("adminLogin");

    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("auth_id", data.user.id)
      .maybeSingle();

    if (!userData?.is_admin) {
      setAccessDenied(true);
      setPage("home");
      return;
    }

    setPage("dashboard");
  };

  const checkRef = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) return setPage("refLogin");

    setPage("refDashboard");
  };

  /* ================= 🔥 FIXED AUTH LISTENER ================= */

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_, session) => {

        if (!session) {
          const path = window.location.pathname.toLowerCase();

          if (path.startsWith("/admin")) {
            setPage("adminLogin");
          }

          if (path.startsWith("/ref")) {
            setPage("refLogin");
          }
        }

      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ================= URL SYNC ================= */

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

  /* ================= UI ================= */

  return (
    <>
      {/* ANDROID INSTALL */}
      {deferredPrompt && (
        <button style={installBtn} onClick={installApp}>
          Install App
        </button>
      )}

      {/* iPHONE INSTALL */}
      {showIOSInstall &&
        createPortal(
          <IOSInstallModal onClose={() => setShowIOSInstall(false)} />,
          document.body
        )}

      {/* ACCESS DENIED */}
      {accessDenied &&
        createPortal(
          <AccessDeniedModal onClose={() => setAccessDenied(false)} />,
          document.body
        )}

      {/* ADMIN */}
      {page === "adminLogin" && <LoginModal setPage={setPage} />}

      {page === "dashboard" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>
          <Dashboard adminPage={adminPage} setAdminPage={setAdminPage} />
        </AdminLayout>
      )}

      {/* REF */}
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

      {/* PUBLIC */}
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

/* ================= MODALS ================= */

function IOSInstallModal({ onClose }) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>Install App</h2>
        <p>Tap Share → Add to Home Screen</p>
        <button style={btn} onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

function AccessDeniedModal({ onClose }) {
  return (
    <div style={overlay}>
      <div style={modal}>
        <h2>Access Denied</h2>
        <button style={btn} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const installBtn = {
  position: "fixed",
  bottom: 20,
  right: 20,
  padding: 12,
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none"
};

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
};

const modal = {
  background: "#fff",
  padding: 20,
  borderRadius: 12
};

const btn = {
  padding: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 8
};
