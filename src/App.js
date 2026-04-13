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

  const isHomePage = page === "home";

  /* ================= INSTALL ================= */

  useEffect(() => {
    const handler = (e) => {
      if (window.location.pathname !== "/") return;

      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    if (isIOS && !isStandalone && window.location.pathname === "/") {
      setTimeout(() => {
        setShowIOSInstall(true);
      }, 1000);
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

  /* ================= SESSION RESTORE ================= */

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
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;

    let path = window.location.pathname.toLowerCase();

    // 🔥 PWA FIX (prevents white screen)
    if (isStandalone && (!path || path === "" || path === "/index.html")) {
      path = "/";
      window.history.replaceState({}, "", "/");
    }

    /* ===== PUBLIC ROUTES FIRST ===== */

    if (path === "/") return setPage("home");

    if (path === "/signup") return setPage("signup");
    if (path === "/coach-signup") return setPage("coachSignup");
    if (path === "/ref-signup") return setPage("refSignup");

    if (path === "/login") return setPage("loginSelect");

    /* ===== ADMIN ===== */

    if (path.startsWith("/admin")) {
      checkAdmin();
      return;
    }

    /* ===== REF PORTAL (PROTECTED ONLY) ===== */

    if (path === "/ref" || path.startsWith("/ref/")) {
      checkRef();
      return;
    }

    /* ===== FALLBACK ===== */

    setPage("home");

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

  /* ================= AUTH LISTENER ================= */

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
    if (page === "signup") window.history.pushState({}, "", "/signup");
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
      {deferredPrompt && isHomePage && (
        <button style={installBtn} onClick={installApp}>
          Install App
        </button>
      )}

      {showIOSInstall && isHomePage &&
        createPortal(
          <IOSInstallModal onClose={() => setShowIOSInstall(false)} />,
          document.body
        )}

      {accessDenied &&
        createPortal(
          <AccessDeniedModal onClose={() => setAccessDenied(false)} />,
          document.body
        )}

      {page === "adminLogin" && <LoginModal setPage={setPage} />}

      {page === "dashboard" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>
          <Dashboard adminPage={adminPage} setAdminPage={setAdminPage} />
        </AdminLayout>
      )}

      {/* 🔥 REF PORTAL ONLY */}
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

      {/* 🔥 PUBLIC */}
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
