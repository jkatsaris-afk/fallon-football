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
import CoachLoginPage from "./pages/Auth/CoachLoginPage";
import RefLoginPage from "./pages/Auth/RefLoginPage";
import ParentLoginPage from "./pages/Auth/ParentLoginPage";
import AdminLoginPage from "./pages/Auth/AdminLoginPage";
import ResetPasswordPage from "./pages/Auth/ResetPasswordPage";

// REF APP
import RefLayout from "./layouts/RefLayout";
import RefDashboard from "./pages/Ref/RefDashboard";
import RefSchedule from "./pages/Ref/RefSchedule";
import RefTime from "./pages/Ref/RefTime";
import RefProfile from "./pages/Ref/RefProfile";
import RefAvailabilityPage from "./pages/Ref/RefAvailabilityPage";

import Dashboard from "./pages/Admin/Dashboard";

import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";

import { supabase } from "./supabase";

export default function App() {
  const [page, setPage] = useState(null);
  const [adminPage, setAdminPage] = useState("dashboard");
  const [accessDenied, setAccessDenied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      let path = window.location.pathname.toLowerCase();

      if (!path || path === "" || path === "/index.html") {
        path = "/";
        window.history.replaceState({}, "", "/");
      }

      if (path === "/") setPage("home");
      else if (path === "/schedule") setPage("schedule"); // 🔥 FIX
      else if (path === "/scoreboard") setPage("scoreboard"); // 🔥 FIX
      else if (path === "/signup") setPage("signup");
      else if (path === "/coach-signup") setPage("coachSignup");
      else if (path === "/ref-signup") setPage("refSignup");
      else if (path === "/login") setPage("loginSelect");

      else if (path === "/ref-login") setPage("refLogin");
      else if (path === "/coach-login") setPage("coachLogin");
      else if (path === "/parent-login") setPage("parentLogin");
      else if (path === "/admin-login") setPage("adminLogin");
      else if (path === "/reset-password") setPage("resetPassword");

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

  const checkAdmin = async () => {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (!user) {
      setPage("adminLogin");
      return;
    }

    const { data: userData, error: roleError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (roleError) {
      setPage("adminLogin");
      return;
    }

    if (!userData || !userData.is_admin) {
      setAccessDenied(true);
      setPage("home");
      return;
    }

    setAccessDenied(false);
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

  useEffect(() => {
    if (page === "home") window.history.pushState({}, "", "/");
    if (page === "schedule") window.history.pushState({}, "", "/schedule"); // 🔥 FIX
    if (page === "scoreboard") window.history.pushState({}, "", "/scoreboard"); // 🔥 FIX
    if (page === "signup") window.history.pushState({}, "", "/signup");
    if (page === "coachSignup") window.history.pushState({}, "", "/coach-signup");
    if (page === "refSignup") window.history.pushState({}, "", "/ref-signup");
    if (page === "loginSelect") window.history.pushState({}, "", "/login");

    if (page === "refLogin") window.history.pushState({}, "", "/ref-login");
    if (page === "coachLogin") window.history.pushState({}, "", "/coach-login");
    if (page === "parentLogin") window.history.pushState({}, "", "/parent-login");
    if (page === "adminLogin") window.history.pushState({}, "", "/admin-login");

    if (page === "resetPassword") window.history.pushState({}, "", "/reset-password");

    if (page === "refDashboard") window.history.pushState({}, "", "/ref");
    if (page === "refSchedule") window.history.pushState({}, "", "/ref/schedule");
    if (page === "refTime") window.history.pushState({}, "", "/ref/time");
    if (page === "refAvailability") window.history.pushState({}, "", "/ref/availability");
    if (page === "refProfile") window.history.pushState({}, "", "/ref/profile");

    if (page === "dashboard") window.history.pushState({}, "", "/admin");
  }, [page]);

  if (!ready || page === null) return <LoadingScreen />;

  return (
    <>
      {accessDenied &&
        createPortal(
          <AccessDeniedModal onClose={() => setAccessDenied(false)} />,
          document.body
        )}

      {(page === "adminLogin" ||
        page === "refLogin" ||
        page === "coachLogin" ||
        page === "parentLogin" ||
        page === "resetPassword") && (
        <>
          {page === "adminLogin" && <AdminLoginPage />}
          {page === "refLogin" && <RefLoginPage setPage={setPage} />}
          {page === "coachLogin" && <CoachLoginPage setPage={setPage} />}
          {page === "parentLogin" && <ParentLoginPage setPage={setPage} />}
          {page === "resetPassword" && <ResetPasswordPage />}
        </>
      )}

      {page === "dashboard" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>
          <Dashboard adminPage={adminPage} setAdminPage={setAdminPage} />
        </AdminLayout>
      )}

      {page.startsWith("ref") &&
        page !== "refLogin" &&
        page !== "refSignup" && (
          <RefLayout page={page} setPage={setPage}>
            {page === "refDashboard" && <RefDashboard />}
            {page === "refSchedule" && <RefSchedule />}
            {page === "refTime" && <RefTime />}
            {page === "refAvailability" && <RefAvailabilityPage />}
            {page === "refProfile" && <RefProfile />}
          </RefLayout>
        )}

      {page !== "dashboard" &&
        page !== "adminLogin" &&
        page !== "refLogin" &&
        page !== "coachLogin" &&
        page !== "parentLogin" &&
        page !== "resetPassword" &&
        (!page.startsWith("ref") ||
          page === "refSignup") && (
          <PublicLayout page={page} setPage={setPage}>
            {page === "home" && <HomePage setPage={setPage} />}
            {page === "schedule" && <SchedulePage setPage={setPage} />}
            {page === "scoreboard" && <ScoreboardPage />}
            {page === "teamSchedules" && <TeamSchedulesPage setPage={setPage} />}

            {page === "loginSelect" && <LoginSelectPage setPage={setPage} />}

            {page === "signupSelect" && <SignUpSelectPage setPage={setPage} />}
            {page === "signup" && <SignUpPage />}
            {page === "coachSignup" && <CoachSignUpPage />}
            {page === "refSignup" && <RefSignUpPage />}
          </PublicLayout>
        )}
    </>
  );
}
