import logo from "../resources/logo.png";
import { Home, Calendar, Trophy, UserPlus } from "lucide-react";

export default function PublicLayout({ children, page, setPage }) {
  return (
    <div className="app-container">

      {/* HEADER */}
      <div className="header">
        <img src={logo} className="logo" alt="logo" />
      </div>

      {/* CONTENT */}
      <div className="content">
        {children}
      </div>

      {/* NAV */}
      <div className="nav">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={page === "home"}
          onClick={() => setPage("home")}
        />

        <NavItem
          icon={<Calendar size={22} />}
          label="Schedule"
          active={page === "schedule"}
          onClick={() => setPage("schedule")}
        />

        <NavItem
          icon={<Trophy size={22} />}
          label="Scores"
          active={page === "scoreboard"}
          onClick={() => setPage("scoreboard")}
        />

        <NavItem
          icon={<UserPlus size={22} />}
          label="Sign Up"
          active={page === "signupSelect"}
          onClick={() => setPage("signupSelect")}
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
