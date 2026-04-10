import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function TeamSchedulesPage({ setPage }) {
  const [games, setGames] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    if (!data) return;
    setGames(data);
  };

  // Build team list
  const teamList = [...new Set(
    games.map(g => `${g.division} ${g.team}`)
  )].sort();

  // PDF path (from /public/schedules)
  const getPdfPath = (team) => {
    return `/schedules/${encodeURIComponent(team)}.pdf`;
  };

  return (
    <div>

      {/* HEADER */}
      <div className="card active-card">
        <div className="title">Full Team Schedules</div>
      </div>

      {/* BACK */}
      <div className="card" onClick={() => setPage("schedule")}>
        <div className="sub">← Back to Schedule</div>
      </div>

      {/* TEAM LIST */}
      {!selectedTeam && (
        <div>
          {teamList.map((team, i) => (
            <div key={i} className="card" onClick={() => setSelectedTeam(team)}>
              <div className="title">{team}</div>
            </div>
          ))}
        </div>
      )}

      {/* PDF VIEW */}
      {selectedTeam && (
        <div>

          <div className="card active-card">
            <div className="title">{selectedTeam}</div>
          </div>

          <div className="card" onClick={() => setSelectedTeam(null)}>
            <div className="sub">← Back to Teams</div>
          </div>

          <div className="card">
            <iframe
              src={getPdfPath(selectedTeam)}
              width="100%"
              height="650px"
              title="Team Schedule"
            />
          </div>

        </div>
      )}

    </div>
  );
}
