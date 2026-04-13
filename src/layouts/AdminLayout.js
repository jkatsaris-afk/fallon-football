import { useEffect, useState } from "react";
import fallonLogo from "../resources/logo.png";

export default function AdminLayout({
  adminPage,
  setAdminPage,
  children
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 800);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={container}>

      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <div style={sidebar}>
          <img src={fallonLogo} alt="logo" style={{ width: 36, marginBottom: 20 }} />

          <NavBtn label="Home" active={adminPage === "dashboard"} onClick={() => setAdminPage("dashboard")} />
          <NavBtn label="Teams" active={adminPage === "teams"} onClick={() => setAdminPage("teams")} />
          <NavBtn label="Players" active={adminPage === "players"} onClick={() => setAdminPage("players")} />
          <NavBtn label="Matchups" active={adminPage === "matchups"} onClick={() => setAdminPage("matchups")} />
          <NavBtn label="Schedule" active={adminPage === "schedule"} onClick={() => setAdminPage("schedule")} />
          <NavBtn label="Games" active={adminPage === "games"} onClick={() => setAdminPage("games")} />
          <NavBtn label="Fields" active={adminPage === "fields"} onClick={() => setAdminPage("fields")} />
          <NavBtn label="Coaches" active={adminPage === "coaches"} onClick={() => setAdminPage("coaches")} />
          <NavBtn label="Referees" active={adminPage === "referees"} onClick={() => setAdminPage("referees")} />
          <NavBtn label="Reports" active={adminPage === "reports"} onClick={() => setAdminPage("reports")} />
          <NavBtn label="Settings" active={adminPage === "settings"} onClick={() => setAdminPage("settings")} />
        </div>
      )}

      {/* MAIN */}
      <div style={main}>

        {/* TOP BAR */}
        <div style={topBar}>
          Fallon Football Admin
        </div>

        {/* CONTENT */}
        <div style={content}>
          {children}
        </div>

        {/* MOBILE NAV */}
        {isMobile && (
          <div style={mobileNav}>

            <MobileNavBtn label="Home" active={adminPage === "dashboard"} onClick={() => setAdminPage("dashboard")} />
            <MobileNavBtn label="Teams" active={adminPage === "teams"} onClick={() => setAdminPage("teams")} />
            <MobileNavBtn label="Lookup" active={adminPage === "lookup"} onClick={() => setAdminPage("lookup")} />
            <MobileNavBtn label="Game" active={adminPage === "games"} onClick={() => setAdminPage("games")} />
            <MobileNavBtn label="More" active={adminPage === "more"} onClick={() => setAdminPage("more")} />

          </div>
        )}

      </div>
    </div>
  );
}

/* COMPONENTS */

function NavBtn({ label, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: "10px 12px",
      borderRadius: 8,
      cursor: "pointer",
      background: active ? "#16a34a" : "transparent",
      color: active ? "#fff" : "#374151",
      marginBottom: 4
    }}>
      {label}
    </div>
  );
}

function MobileNavBtn({ label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: 11,
        cursor: "pointer",
        color: active ? "#16a34a" : "#777",
        transform: active ? "translateY(-2px)" : "none"
      }}
    >
      <div style={{ fontSize: 18 }}>{getIcon(label)}</div>
      {label}
    </div>
  );
}

function getIcon(label) {
  switch (label) {
    case "Home": return "🏠";
    case "Teams": return "👥";
    case "Lookup": return "🔍";
    case "Game": return "🏈";
    case "More": return "⚙️";
    default: return "•";
  }
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
  height: 60,
  background: "#fff",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  padding: "0 20px",
  fontWeight: 600
};

const content = {
  flex: 1,
  overflowY: "auto",
  padding: 20,
  paddingBottom: 80
};

const mobileNav = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  height: 65,
  background: "#fff",
  borderTop: "1px solid #ddd",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center"
};
