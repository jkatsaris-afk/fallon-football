// ... EVERYTHING ABOVE STAYS EXACTLY THE SAME

  return (
    <>
      {accessDenied &&
        createPortal(
          <AccessDeniedModal onClose={() => setAccessDenied(false)} />,
          document.body
        )}

      {page === "adminLogin" && <LoginModal setPage={setPage} />}

      {page === "dashboard" && (
        <AdminLayout adminPage={adminPage} setAdminPage={setAdminPage}>

          {adminPage === "dashboard" && (
            <Dashboard adminPage={adminPage} setAdminPage={setAdminPage} />
          )}

          {adminPage === "referees" && (
            <RefereeSchedulePage setPage={setPage} />
          )}

          {adminPage === "autoAssign" && (
            <AutoAssignPage setPage={setPage} />
          )}

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
