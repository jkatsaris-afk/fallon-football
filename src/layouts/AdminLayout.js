import { useEffect, useState } from "react";
import fallonLogo from "../resources/logo.png";
import {
  Home,
  Layers,
  MoreHorizontal,
  Trophy,
  Users,
} from "lucide-react";
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
  { label: "Settings", page: "settings" },
];

export default function AdminLayout({
  adminPage,
  setAdminPage,
  children,
  setPage
}) {
  const [isMobile, setIsMobile] = useState(false);
  const primaryMobilePages = ["dashboard", "divisions", "teams", "games"];

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
          </div>

          <button style={logoutBtn} onClick={logout}>
            Logout
          </button>
        </div>

        <div
          style={{ ...content, paddingBottom: isMobile ? 92 : 80 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>

        {isMobile && (
          <div className="nav-wrap" style={{ zIndex: 1000 }}>
            <NavItem
              icon={<Home size={22} />}
              label="Home"
              active={adminPage === "dashboard"}
              onClick={() => setAdminPage("dashboard")}
            />
            <NavItem
              icon={<Layers size={22} />}
              label="Divisions"
              active={adminPage === "divisions"}
              onClick={() => setAdminPage("divisions")}
            />
            <NavItem
              icon={<Users size={22} />}
              label="Teams"
              active={adminPage === "teams"}
              onClick={() => setAdminPage("teams")}
            />
            <NavItem
              icon={<Trophy size={22} />}
              label="Games"
              active={adminPage === "games"}
              onClick={() => setAdminPage("games")}
            />
            <NavItem
              icon={<MoreHorizontal size={22} />}
              label="More"
              active={adminPage === "more" || !primaryMobilePages.includes(adminPage)}
              onClick={() => setAdminPage("more")}
            />
          </div>
        )}

      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div
      className={`nav-item2 ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
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
