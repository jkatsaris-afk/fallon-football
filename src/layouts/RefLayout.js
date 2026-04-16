import { Home, Calendar, Clock, User } from "lucide-react";

export default function RefLayout({ page, setPage, children }) {
  return (
    <div className="app-container">

      <div className="content">
        {children}
      </div>

      {/* 🔥 NAV */}
      <div className="nav">

        <NavItem
          icon={<Calendar size={24} />}
          label="Schedule"
          active={page === "refSchedule"}
          onClick={() => setPage("refSchedule")}
        />

        <NavItem
          icon={<Clock size={24} />}
          label="Time"
          active={page === "refTime"}
          onClick={() => setPage("refTime")}
        />

        {/* 🔥 CENTER HOME BUTTON */}
        <HomeButton
          active={page === "refDashboard"}
          onClick={() => setPage("refDashboard")}
        />

        <NavItem
          icon={<Calendar size={24} />}
          label="Availability"
          active={page === "refAvailability"}
          onClick={() => setPage("refAvailability")}
        />

        <NavItem
          icon={<User size={24} />}
          label="Profile"
          active={page === "refProfile"}
          onClick={() => setPage("refProfile")}
        />

      </div>
    </div>
  );
}

/* 🔥 STANDARD NAV ITEM */
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

/* 🔥 CENTER HOME BUTTON */
function HomeButton({ active, onClick }) {
  return (
    <div
      className={`home-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <Home size={26} />
    </div>
  );
}
