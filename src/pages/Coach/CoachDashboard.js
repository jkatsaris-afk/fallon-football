export default function CoachDashboard() {
  return (
    <div>

      <div className="card">
        <div className="title">My Team</div>
        <div className="sub">Steelers</div>
      </div>

      <div className="card">
        <div className="title">Practice</div>
        <div className="sub">Set practice times</div>
        <button className="button">Schedule Practice</button>
      </div>

      <div className="card">
        <div className="title">Announcements</div>
        <div className="sub">Message parents</div>
        <button className="button">Send Update</button>
      </div>

    </div>
  );
}
