import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./styles.css";

import LoadingScreen from "./LoadingScreen";

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

// ADMIN
import Dashboard from "./pages/Admin/Dashboard";
import AutoAssignPage from "./pages/Admin/RefereeManagerPages/AutoAssignPage"; // 🔥 ADDED

import LoginModal from "./components/LoginModal";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";

import { supabase } from "./supabase";

export default function App() {
  const [page, setPage] = useState(null);
  const [adminPage, setAdminPage] = useState("dashboard");
  const [accessDenied, setAccessDenied] = useState(false);
  const [ready, setReady] = useState(false);

  /* ================= INIT ================= */

  useEffect(() => {
    const init = async () => {
      let path = window.location.pathname.toLowerCase();

      if (!path || path === "" || path === "/index.html") {
        path = "/";
        window.history.replaceState({}, "", "/");
      }

      if (path === "/") setPage("home");
      else if (path === "/signup") setPage("signup");
      else if (path === "/coach-signup") setPage("coachSignup");
      else if (path === "/ref-signup") setPage("refSignup");
      else if (path === "/login") setPage("loginSelect");

      // 🔥 NEW AUTO ASSIGN ROUTE
      else if (path === "/admin/auto-assign") {
        await checkAdmin();
        setPage("autoAssign");
        setReady(true);
        return;
      }

      else if (path.startsWith("/admin")) {
        await checkAdmin();
        setReady(true);
        return;
      }

      else if (path === "/ref" || path.startsWith("/ref/")) {
        await checkRef();
        setReady(true);
        return;
      }

      else setPage("home");

      setReady(true);
    };

    init();
  }, []);

  /* ================= AUTH ================= */

  const checkAdmin = async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setPage("adminLogin");
      return;
    }

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

    if (!data.user) {
      setPage("refLogin");
      return;
    }

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

          if (path === "/ref" || path.startsWith("/ref/")) {
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

    // 🔥 NEW AUTO ASSIGN URL
    if (page === "autoAssign")
      window.history.pushState({}, "", "/admin/auto-assign");

  }, [page]);

  /* ================= BLOCK RENDER ================= */

  if (!ready || page === null) return <LoadingScreen />;

  /* ================= UI ================= */

  return (
    <>
      {accessDenied &&
        createPortal(
          <AccessDeniedModal onClose={() => setAccessDenied(false)} />,
          document.body
        )}

      {page === "adminLogin" && <LoginModal setPage={setPage} />}

      {/* 🔥 ADMIN DASHBOARD */}
      {page === "dashboard" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>
          <Dashboard adminPage={adminPage} setAdminPage={setAdminPage} />
        </AdminLayout>
      )}

      {/* 🔥 AUTO ASSIGN PAGE */}
      {page === "autoAssign" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>
          <AutoAssignPage setPage={setPage} />
        </AdminLayout>
      )}

      {/* REF APP */}
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
        page !== "autoAssign" && (
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
