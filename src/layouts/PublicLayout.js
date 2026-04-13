export default function PublicLayout({ children, page, setPage }) {
  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        <img src="/logo.png" className="logo" alt="logo" />
      </div>

      {/* PAGE CONTENT */}
      <div className="page-content">
        {children}
      </div>

      {/* BOTTOM NAV */}
      <div className="bottom-nav">

        <button
          className={`nav-btn ${page === "home" ? "active" : ""}`}
          onClick={() => setPage("home")}
        >
          Home
        </button>

        <button
          className={`nav-btn ${page === "schedule" ? "active" : ""}`}
          onClick={() => setPage("schedule")}
        >
          Schedule
        </button>

        <button
          className={`nav-btn ${page === "scoreboard" ? "active" : ""}`}
          onClick={() => setPage("scoreboard")}
        >
          Scores
        </button>

        <button
          className={`nav-btn ${page === "signupSelect" ? "active" : ""}`}
          onClick={() => setPage("signupSelect")}
        >
          Sign Up
        </button>

      </div>

    </div>
  );
}
