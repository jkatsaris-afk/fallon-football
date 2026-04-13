import logo from "../resources/logo.png";

export default function AdminLayout({
  adminPage,
  setAdminPage,
  children
}) {
  return (
    <div className="admin-container">

      {/* SIDEBAR */}
      <div className="admin-sidebar">

        <img src={logo} className="admin-logo" alt="logo" />

        <SidebarItem
          label="Dashboard"
          active={adminPage === "dashboard"}
          onClick={() => setAdminPage("dashboard")}
        />

        <SidebarItem
          label="Teams"
          active={adminPage === "teams"}
          onClick={() => setAdminPage("teams")}
        />

        <SidebarItem
          label="Players"
          active={adminPage === "players"}
          onClick={() => setAdminPage("players")}
        />

        <SidebarItem
          label="Schedule"
          active={adminPage === "schedule"}
          onClick={() => setAdminPage("schedule")}
        />

        <SidebarItem
          label="Matchups"
          active={adminPage === "matchups"}
          onClick={() => setAdminPage("matchups")}
        />

        <SidebarItem
          label="Settings"
          active={adminPage === "settings"}
          onClick={() => setAdminPage("settings")}
        />

      </div>

      {/* MAIN CONTENT */}
      <div className="admin-content">
        {children}
      </div>

    </div>
  );
}

function SidebarItem({ label, active, onClick }) {
  return (
    <div
      className={`admin-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {label}
    </div>
  );
}
