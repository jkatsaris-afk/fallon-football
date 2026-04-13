import { Home, Calendar, Clock, User } from "lucide-react";

export default function RefLayout({ page, setPage, children }) {
  return (
    <div className="app-container">

      {/* CONTENT */}
      <div className="content">
        {children}
      </div>

      {/* NAV */}
      <div className="nav">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={page === "refDashboard"}
          onClick={() => setPage("refDashboard")}
        />

        <NavItem
          icon={<Calendar size={22} />}
          label="Schedule"
          active={page === "refSchedule"}
          onClick={() => setPage("refSchedule")}
        />

        <NavItem
          icon={<Clock size={22} />}
          label="Time"
          active={page === "refTime"}
          onClick={() => setPage("refTime")}
        />

        <NavItem
          icon={<User size={22} />}
          label="Profile"
          active={page === "refProfile"}
          onClick={() => setPage("refProfile")}
        />

      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
