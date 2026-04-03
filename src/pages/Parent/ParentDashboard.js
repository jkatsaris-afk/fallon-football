export default function ParentDashboard() {
  return (
    <div>

      <div className="card">
        <div className="title">My Kids</div>
        <div className="sub">View team assignments</div>
      </div>

      <div className="card">
        <div className="title">Schedule</div>
        <div className="sub">Upcoming games</div>
        <button className="button">View Schedule</button>
      </div>

      <div className="card">
        <div className="title">Messages</div>
        <div className="sub">Coach updates</div>
      </div>

    </div>
  );
}
