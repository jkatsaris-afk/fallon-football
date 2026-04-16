import { Home, Calendar, Clock, User } from "lucide-react";
import { useState } from "react";

export default function RefLayout({ page, setPage, children }) {
  const [animating, setAnimating] = useState(false);

  const handleNav = (target) => {
    if (target === page) return;

    setAnimating(true);
    setTimeout(() => {
      setPage(target);
      setAnimating(false);
    }, 120);
  };

  return (
    <div className="app-container">

      <div className={`content ${animating ? "page-anim" : ""}`}>
        {children}
      </div>

      <div className="nav-wrap">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={page === "refDashboard"}
          onClick={() => handleNav("refDashboard")}
        />

        <NavItem
          icon={<Calendar size={22} />}
          label="Schedule"
          active={page === "refSchedule"}
          onClick={() => handleNav("refSchedule")}
        />

        <NavItem
          icon={<Clock size={22} />}
          label="Time"
          active={page === "refTime"}
          onClick={() => handleNav("refTime")}
        />

        <NavItem
          icon={<Calendar size={22} />}
          label="Availability"
          active={page === "refAvailability"}
          onClick={() => handleNav("refAvailability")}
        />

        <NavItem
          icon={<User size={22} />}
          label="Profile"
          active={page === "refProfile"}
          onClick={() => handleNav("refProfile")}
        />

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
