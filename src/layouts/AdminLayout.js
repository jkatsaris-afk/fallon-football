import fallonLogo from "../resources/logo.png";

export default function AdminLayout({
  adminPage,
  setAdminPage,
  children
}) {
  return (
    <div style={container}>

      {/* SIDEBAR */}
      <div style={sidebar}>
        <img src={fallonLogo} alt="logo" style={{ width: 36, marginBottom: 20 }} />

        <Section title="LEAGUE">
          <NavBtn label="Home" active={adminPage === "dashboard"} onClick={() => setAdminPage("dashboard")} />
          <NavBtn label="Teams" active={adminPage === "teams"} onClick={() => setAdminPage("teams")} />
          <NavBtn label="Players" active={adminPage === "players"} onClick={() => setAdminPage("players")} />
        </Section>

        <Section title="GAME DAY">
          <NavBtn label="Matchups" active={adminPage === "matchups"} onClick={() => setAdminPage("matchups")} />
          <NavBtn label="Schedule" active={adminPage === "schedule"} onClick={() => setAdminPage("schedule")} />
          <NavBtn label="Games" active={adminPage === "games"} onClick={() => setAdminPage("games")} />
          <NavBtn label="Fields" active={adminPage === "fields"} onClick={() => setAdminPage("fields")} />
        </Section>

        <Section title="STAFF">
          <NavBtn label="Coaches" active={adminPage === "coaches"} onClick={() => setAdminPage("coaches")} />
          <NavBtn label="Referees" active={adminPage === "referees"} onClick={() => setAdminPage("referees")} />
        </Section>

        <Section title="SYSTEM">
          <NavBtn label="Reports" active={adminPage === "reports"} onClick={() => setAdminPage("reports")} />
          <NavBtn label="Settings" active={adminPage === "settings"} onClick={() => setAdminPage("settings")} />
        </Section>
      </div>

      {/* MAIN AREA */}
      <div style={main}>

        {/* TOP BAR */}
        <div style={topBar}>
          <div style={{ fontWeight: 600 }}>
            Fallon Football Admin
          </div>
        </div>

        {/* CONTENT */}
        <div style={content}>
          {children}
        </div>

      </div>
    </div>
  );
}

/* COMPONENTS */

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={section}>{title}</div>
      {children}
    </div>
  );
}

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
        marginBottom: 4,
        fontWeight: active ? 600 : 500
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
  background: "#f1f5f9" // softer background (app feel)
};

const sidebar = {
  width: 230,
  background: "#ffffff",
  padding: 16,
  borderRight: "1px solid #e5e7eb",
  overflowY: "auto"
};

const main = {
  flex: 1,
  display: "flex",
  flexDirection: "column"
};

const topBar = {
  height: 60,
  background: "#ffffff",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center",
  padding: "0 20px"
};

const content = {
  flex: 1,
  overflowY: "auto",
  padding: 20
};

const section = {
  fontSize: 12,
  color: "#94a3b8",
  fontWeight: 600,
  marginBottom: 6
};
