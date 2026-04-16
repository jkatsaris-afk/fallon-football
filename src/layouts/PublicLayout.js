import logo from "../resources/logo.png";
import {
  Home,
  Calendar,
  Trophy,
  UserPlus,
  LogIn,
  Users,
  Shield,
  Flag
} from "lucide-react";
import { useState } from "react";

export default function PublicLayout({ children }) {
  const [showSignupMenu, setShowSignupMenu] = useState(false);
  const [showLoginMenu, setShowLoginMenu] = useState(false);

  const currentPath = window.location.pathname;

  const goTo = (path) => {
    setShowSignupMenu(false);
    setShowLoginMenu(false);
    window.location.href = path;
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

      {/* 🔥 SHARED BACKDROP */}
      {(showSignupMenu || showLoginMenu) && (
        <div
          className="popup-backdrop"
          onClick={() => {
            setShowSignupMenu(false);
            setShowLoginMenu(false);
          }}
        />
      )}

      {/* 🔥 SIGNUP POPUP */}
      {showSignupMenu && (
        <div className="popup-wrap">
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>

            <PopupItem
              icon={<Users size={20} />}
              label="Player"
              onClick={() => goTo("/signup")}
            />

            <PopupItem
              icon={<Shield size={20} />}
              label="Coach"
              onClick={() => goTo("/coach-signup")}
            />

            <PopupItem
              icon={<Flag size={20} />}
              label="Referee"
              onClick={() => goTo("/ref-signup")}
            />

          </div>
        </div>
      )}

      {/* 🔥 NEW LOGIN POPUP */}
      {showLoginMenu && (
        <div className="popup-wrap">
          <div className="popup-card" onClick={(e) => e.stopPropagation()}>

            <PopupItem
              icon={<Flag size={20} />}
              label="Referee"
              onClick={() => goTo("/ref-login")}
            />

            <PopupItem
              icon={<Shield size={20} />}
              label="Coach"
              onClick={() => goTo("/coach-login")}
            />

            <PopupItem
              icon={<Users size={20} />}
              label="Parent"
              onClick={() => goTo("/parent-login")}
            />

          </div>
        </div>
      )}

      {/* NAV */}
      <div className="nav-wrap">

        <NavItem
          icon={<Home size={22} />}
          label="Home"
          active={currentPath === "/"}
          onClick={() => goTo("/")}
        />

        <NavItem
          icon={<Calendar size={22} />}
          label="Schedule"
          active={currentPath === "/schedule"}
          onClick={() => goTo("/schedule")}
        />

        <NavItem
          icon={<Trophy size={22} />}
          label="Scores"
          active={currentPath === "/scoreboard"}
          onClick={() => goTo("/scoreboard")}
        />

        {/* SIGN UP */}
        <NavItem
          icon={<UserPlus size={22} />}
          label="Sign Up"
          active={
            showSignupMenu ||
            currentPath === "/signup" ||
            currentPath === "/coach-signup" ||
            currentPath === "/ref-signup"
          }
          onClick={() => {
            setShowLoginMenu(false);
            setShowSignupMenu(prev => !prev);
          }}
        />

        {/* 🔥 LOGIN */}
        <NavItem
          icon={<LogIn size={22} />}
          label="Login"
          active={
            showLoginMenu ||
            currentPath === "/ref-login" ||
            currentPath === "/coach-login" ||
            currentPath === "/parent-login"
          }
          onClick={() => {
            setShowSignupMenu(false);
            setShowLoginMenu(prev => !prev);
          }}
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
