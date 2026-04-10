import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

// ===== LOGOS =====
import sf from "../../resources/San Francisco 49ers.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import bills from "../../resources/Buffalo Bills.png";
import broncos from "../../resources/Denver Broncos.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import colts from "../../resources/Indianapolis Colts.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import jets from "../../resources/New York Jets.png";
import lions from "../../resources/Detroit Lions.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import steelers from "../../resources/Pittsburgh Steelers.png";
import ravens from "../../resources/Baltimore Ravens.png";

// ===== LOGO MAP =====
const teamLogos = {
  "49ers": sf,
  "Bengals": bengals,
  "Bills": bills,
  "Broncos": broncos,
  "Chiefs": chiefs,
  "Colts": colts,
  "Eagles": eagles,
  "Jets": jets,
  "Lions": lions,
  "Raiders": raiders,
  "Rams": rams,
  "Steelers": steelers,
  "Ravens": ravens,
};

function getLogo(name) {
  if (!name) return null;
  return teamLogos[name.trim()] || null;
}

// ✅ NEW: PDF PATH BUILDER
function getPdfPath(team) {
  return `/schedules/${team}.pdf`;
}

export default function SchedulePage() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  const [showTeamSchedules, setShowTeamSchedules] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.from("schedule_master").select("*");
    if (!data) return;
    setGames(data);
  };

  // BUILD TEAM LIST
  const teamList = [...new Set(
    games.map(g => `${g.division} ${g.team}`)
  )];

  return (
    <div>

      {/* FULL TEAM SCHEDULE TILE */}
      {!selectedDate && !showTeamSchedules && (
        <div className="card" onClick={() => setShowTeamSchedules(true)}>
          <div className="title">Full Team Schedules</div>
        </div>
      )}

      {/* TEAM LIST */}
      {showTeamSchedules && !selectedTeam && (
        <div>

          <div className="card active-card">
            <div className="title">Select Team</div>
          </div>

          <div className="card" onClick={() => setShowTeamSchedules(false)}>
            <div className="sub">← Back</div>
          </div>

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
            <div className="sub">← Back</div>
          </div>

          <div className="card">
            <iframe
              src={getPdfPath(selectedTeam)}
              width="100%"
              height="600px"
              title="Team Schedule"
            />
          </div>

        </div>
      )}

    </div>
  );
}
