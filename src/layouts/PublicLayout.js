import logo from "../resources/logo.png";
import { Home, Calendar, Trophy, UserPlus, LogIn, Users, Shield, Flag } from "lucide-react";
import { useState } from "react";

export default function PublicLayout({ children, page, setPage }) {
  const [showSignupMenu, setShowSignupMenu] = useState(false);

  const handleSignupSelect = (target) => {
    setShowSignupMenu(false);
    setPage(target);
  };

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

      {/* 🔥 SIGNUP POPUP */}
      {showSignupMenu && (
        <div className="popup-wrap">
          <div className="popup-card">

            <PopupItem
              icon={<Users size={20} />}
              label="Player"
              onClick={() => handleSignupSelect("playerSignup")}
            />

            <PopupItem
              icon={<Shield size={20} />}
              label="Coach"
              onClick={() => handleSignupSelect("coachSignup")}
            />

            <PopupItem
              icon={<Flag size={20} />}
              label="Referee"
              onClick={() => handleSignupSelect("refSignup")}
            />

          </div>
        </div>
      )}

      {/* NAV */}
      <div className="nav-wrap">

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

        {/* 🔥 SIGN UP (NOW POPUP) */}
        <NavItem
          icon={<UserPlus size={22} />}
          label="Sign Up"
          active={showSignupMenu}
          onClick={() => setShowSignupMenu(prev => !prev)}
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
          onClick={() => setPage("loginSelect")}
        />

      </div>
    </div>
  );
}

/* NAV ITEM */
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

/* POPUP ITEM */
function PopupItem({ icon, label, onClick }) {
  return (
    <div className="popup-item" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
