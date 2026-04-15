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
import RefereeSchedulePage from "./pages/Admin/RefereeManagerPages/RefereeSchedulePage"; // 🔥 ADD THIS
import AutoAssignPage from "./pages/Admin/RefereeManagerPages/AutoAssignPage";

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

      // 🔥 AUTO ASSIGN
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

  /* ================= URL SYNC ================= */

  useEffect(() => {
    if (page === "home") window.history.pushState({}, "", "/");
    if (page === "dashboard") window.history.pushState({}, "", "/admin");
    if (page === "autoAssign")
      window.history.pushState({}, "", "/admin/auto-assign");
  }, [page]);

  if (!ready || page === null) return <LoadingScreen />;

  return (
    <>
      {page === "adminLogin" && <LoginModal setPage={setPage} />}

      {/* 🔥 ADMIN */}
      {page === "dashboard" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>

          {adminPage === "dashboard" && (
            <Dashboard
              adminPage={adminPage}
              setAdminPage={setAdminPage}
            />
          )}

          {/* 🔥 THIS WAS MISSING */}
          {adminPage === "refSchedule" && (
            <RefereeSchedulePage setPage={setPage} />
          )}

        </AdminLayout>
      )}

      {/* 🔥 AUTO ASSIGN */}
      {page === "autoAssign" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>
          <AutoAssignPage setPage={setPage} />
        </AdminLayout>
      )}
    </>
  );
}
