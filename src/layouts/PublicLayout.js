import logo from "../resources/logo.png";
import { Home, Calendar, Trophy, UserPlus, LogIn } from "lucide-react";
import { useState } from "react";

export default function PublicLayout({ children, page, setPage }) {
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

      {/* HEADER */}
      <div className="header">
        <img src={logo} className="logo" alt="logo" />
      </div>

      {/* CONTENT */}
      <div className={`content ${animating ? "page-anim" : ""}`}>
        {children}
      </div>

      {/* 🔥 NEW NAV */}
      <div className="nav-wrap">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={page === "home"}
          onClick={() => handleNav("home")}
        />

        <NavItem
          icon={<Calendar size={22} />}
          label="Schedule"
          active={page === "schedule"}
          onClick={() => handleNav("schedule")}
        />

        <NavItem
          icon={<Trophy size={22} />}
          label="Scores"
          active={page === "scoreboard"}
          onClick={() => handleNav("scoreboard")}
        />

        <NavItem
          icon={<UserPlus size={22} />}
          label="Sign Up"
          active={page === "signupSelect"}
          onClick={() => handleNav("signupSelect")}
        />

        <NavItem
          icon={<LogIn size={22} />}
          label="Login"
          active={
            page === "loginSelect" ||
            page === "coachLogin" ||
            page === "refLogin" ||
            page === "parentLogin"
          }
          onClick={() => handleNav("loginSelect")}
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
