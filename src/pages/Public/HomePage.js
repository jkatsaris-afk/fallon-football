export default function HomePage({ setPage }) {
  return (
    <div>

      <div className="card">
        <div className="title">Fallon Flag Football</div>
        <div className="sub">2026 Season</div>
      </div>

      <div className="card">
        <div className="title">Next Game</div>
        <div className="sub">Steelers vs Raiders</div>
        <div className="sub">April 12 • 11:30 AM</div>

        <button
          className="button"
          onClick={() => setPage("schedule")}
        >
          View Schedule
        </button>
      </div>

      <div className="card">
        <div className="title">Announcements</div>
        <div className="sub">
          Season starts April 11th!
        </div>
      </div>

    </div>
  );
}
