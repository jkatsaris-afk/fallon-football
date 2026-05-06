import { useEffect, useState } from "react";
import fallonLogo from "../resources/logo.png";
import { supabase } from "../supabase";

const ADMIN_NAV_ITEMS = [
  { label: "Home", page: "dashboard" },
  { label: "Division Manager", page: "divisions" },
  { label: "Team Manager", page: "teams" },
  { label: "Player Manager", page: "players" },
  { label: "Matchup Manager", page: "matchups" },
  { label: "Schedule Manager", page: "schedule" },
  { label: "Game Manager", page: "games" },
  { label: "Field Manager", page: "fields" },
  { label: "Coach Manager", page: "coaches" },
  { label: "Referee Manager", page: "referees" },
  { label: "Report Manager", page: "reports" },
  { label: "Settings Manager", page: "settings" },
];

export default function AdminLayout({
  adminPage,
  setAdminPage,
  children,
  setPage
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 800);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setPage("home");
  };

  return (
    <div style={container}>

      {!isMobile && (
        <div style={sidebar}>
          <img src={fallonLogo} alt="logo" style={{ width: 36, marginBottom: 20 }} />

          {ADMIN_NAV_ITEMS.map((item) => (
            <NavBtn
              key={item.page}
              label={item.label}
              active={adminPage === item.page}
              onClick={() => setAdminPage(item.page)}
            />
          ))}
        </div>
      )}

      <div style={main}>

        <div style={topBar}>
          <div style={topBarTitle}>
            <span>Fallon Football Admin</span>

            {isMobile && (
              <select
                value={ADMIN_NAV_ITEMS.some((item) => item.page === adminPage) ? adminPage : "dashboard"}
                onChange={(e) => setAdminPage(e.target.value)}
                style={mobileNavSelect}
                aria-label="Admin manager navigation"
              >
                {ADMIN_NAV_ITEMS.map((item) => (
                  <option key={item.page} value={item.page}>
                    {item.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button style={logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>

        <div
          style={{ ...content, paddingBottom: isMobile ? 20 : 80 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>

      </div>
    </div>
  );
}

/* DESKTOP BUTTON */
function NavBtn({ label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        cursor: "pointer",
        background: active ? "#16a34a" : "transparent",
        color: active ? "#fff" : "#374151",
        marginBottom: 4
      }}
    >
      {label}
    </div>
  );
}

/* STYLES */

const container = {
  display: "flex",
  height: "100vh",
  background: "#f8fafc"
};

const sidebar = {
  width: 230,
  background: "#fff",
  padding: 16,
  borderRight: "1px solid #e5e7eb"
};

const main = {
  flex: 1,
  display: "flex",
  flexDirection: "column"
};

const topBar = {
  minHeight: 60,
  background: "#fff",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 20px",
  fontWeight: 600
};

const topBarTitle = {
  alignItems: "center",
  display: "flex",
  flex: 1,
  gap: 12,
  minWidth: 0
};

const mobileNavSelect = {
  background: "#f8fafc",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  color: "#111827",
  flex: 1,
  fontSize: 14,
  fontWeight: 700,
  minWidth: 0,
  padding: "8px 10px"
};

const content = {
  flex: 1,
  overflowY: "auto",
  padding: 20
};

const logoutBtn = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer"
};
