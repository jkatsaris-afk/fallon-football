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

// ===== PDF IMPORTS =====

// 2nd - 3rd
import chiefs23 from "../../resources/2nd - 3rd Chiefs.pdf";
import rams23 from "../../resources/2nd - 3rd Rams.pdf";
import raiders23 from "../../resources/2nd - 3rd Raiders.pdf";
import ravens23 from "../../resources/2nd - 3rd Ravens.pdf";
import bengals23 from "../../resources/2nd - 3rd Bengals.pdf";
import bills23 from "../../resources/2nd - 3rd Bills.pdf";
import colts23 from "../../resources/2nd - 3rd Colts.pdf";
import eagles23 from "../../resources/2nd - 3rd Eagles.pdf";
import jets23 from "../../resources/2nd - 3rd Jets.pdf";
import lions23 from "../../resources/2nd - 3rd Lions.pdf";
import steelers23 from "../../resources/2nd - 3rd Steelers.pdf";
import niners23 from "../../resources/2nd - 3rd 49ers.pdf";

// 4th - 5th
import chiefs45 from "../../resources/4th - 5th Chiefs.pdf";
import rams45 from "../../resources/4th - 5th Rams.pdf";
import raiders45 from "../../resources/4th - 5th Raiders.pdf";
import ravens45 from "../../resources/4th - 5th Ravens.pdf";
import bengals45 from "../../resources/4th - 5th Bengals.pdf";
import bills45 from "../../resources/4th - 5th Bills.pdf";
import colts45 from "../../resources/4th - 5th Colts.pdf";
import eagles45 from "../../resources/4th - 5th Eagles.pdf";
import jets45 from "../../resources/4th - 5th Jets.pdf";
import lions45 from "../../resources/4th - 5th Lions.pdf";
import steelers45 from "../../resources/4th - 5th Steelers.pdf";
import niners45 from "../../resources/4th - 5th 49ers.pdf";

// 6th - 8th
import chiefs68 from "../../resources/6th - 8th Chiefs.pdf";
import rams68 from "../../resources/6th - 8th Rams.pdf";
import raiders68 from "../../resources/6th - 8th Raiders.pdf";
import ravens68 from "../../resources/6th - 8th Ravens.pdf";
import bengals68 from "../../resources/6th - 8th Bengals.pdf";
import bills68 from "../../resources/6th - 8th Bills.pdf";
import colts68 from "../../resources/6th - 8th Colts.pdf";
import eagles68 from "../../resources/6th - 8th Eagles.pdf";
import jets68 from "../../resources/6th - 8th Jets.pdf";
import lions68 from "../../resources/6th - 8th Lions.pdf";
import steelers68 from "../../resources/6th - 8th Steelers.pdf";
import niners68 from "../../resources/6th - 8th 49ers.pdf";

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

// ===== PDF MAP =====
const teamSchedules = {

  "2nd - 3rd Chiefs": chiefs23,
  "2nd - 3rd Rams": rams23,
  "2nd - 3rd Raiders": raiders23,
  "2nd - 3rd Ravens": ravens23,
  "2nd - 3rd Bengals": bengals23,
  "2nd - 3rd Bills": bills23,
  "2nd - 3rd Colts": colts23,
  "2nd - 3rd Eagles": eagles23,
  "2nd - 3rd Jets": jets23,
  "2nd - 3rd Lions": lions23,
  "2nd - 3rd Steelers": steelers23,
  "2nd - 3rd 49ers": niners23,

  "4th - 5th Chiefs": chiefs45,
  "4th - 5th Rams": rams45,
  "4th - 5th Raiders": raiders45,
  "4th - 5th Ravens": ravens45,
  "4th - 5th Bengals": bengals45,
  "4th - 5th Bills": bills45,
  "4th - 5th Colts": colts45,
  "4th - 5th Eagles": eagles45,
  "4th - 5th Jets": jets45,
  "4th - 5th Lions": lions45,
  "4th - 5th Steelers": steelers45,
  "4th - 5th 49ers": niners45,

  "6th - 8th Chiefs": chiefs68,
  "6th - 8th Rams": rams68,
  "6th - 8th Raiders": raiders68,
  "6th - 8th Ravens": ravens68,
  "6th - 8th Bengals": bengals68,
  "6th - 8th Bills": bills68,
  "6th - 8th Colts": colts68,
  "6th - 8th Eagles": eagles68,
  "6th - 8th Jets": jets68,
  "6th - 8th Lions": lions68,
  "6th - 8th Steelers": steelers68,
  "6th - 8th 49ers": niners68,
};

function getLogo(name) {
  if (!name) return null;
  return teamLogos[name.trim()] || null;
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
            {teamSchedules[selectedTeam] ? (
              <iframe
                src={teamSchedules[selectedTeam]}
                width="100%"
                height="600px"
                title="Team Schedule"
              />
            ) : (
              <div className="sub">No schedule uploaded</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
