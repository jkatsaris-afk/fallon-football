import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

/* ================= LOGOS ================= */

import bills from "../../resources/Buffalo Bills.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import broncos from "../../resources/Denver Broncos.png";
import lions from "../../resources/Detroit Lions.png";
import colts from "../../resources/Indianapolis Colts.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import jets from "../../resources/New York Jets.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import steelers from "../../resources/Pittsburgh Steelers.png";
import niners from "../../resources/San Francisco 49ers.png";
import ravens from "../../resources/Baltimore Ravens.png";

const teamLogos = {
  bills, bengals, broncos, lions, colts,
  chiefs, raiders, rams, jets, eagles,
  steelers, "49ers": niners,
  ravens
};

export default function TeamsPage() {
  const [nflTeams, setNflTeams] = useState([]);
  const [teams, setTeams] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [players, setPlayers] = useState([]);

  const [activeTeam, setActiveTeam] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState(false); // ✅ NEW

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: c } = await supabase.from("coaches").select("*");
    const { data: p } = await supabase.from("players").select("*");

    setNflTeams(nfl || []);
    setTeams(t || []);
    setCoaches(c || []);
    setPlayers(p || []);
  };

  const getCoachName = (id) => {
    const c = coaches.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  const updateTeam = async (field, value) => {
    await supabase
      .from("teams")
      .update({ [field]: value })
      .eq("id", activeTeam.id);

    loadData();
  };

  /* ================= TEAM VIEW ================= */

  if (activeTeam) {
    const nfl = nflTeams.find(n => n.id === activeTeam.nfl_team_id);

    return (
      <div>

        <button onClick={() => setActiveTeam(null)}>← Back</button>

        <h1>{nfl?.full_name}</h1>

        <div>{activeTeam.division}</div>

        {/* COACH DISPLAY */}
        <div>
          <div>Head Coach: {getCoachName(activeTeam.coach_id)}</div>
          <div>Assistant: {getCoachName(activeTeam.assistant_coach_id)}</div>
        </div>

        {/* ACTIONS */}
        <div style={{ marginTop: 20 }}>
          <button onClick={() => setShowAssign(true)}>
            Assign Coaches / Division
          </button>

          <button onClick={() => setShowAdd(true)}>
            Add Player
          </button>
        </div>

        {/* ================= ASSIGN POPUP ================= */}
        {showAssign && (
          <div style={popup}>

            <h3>Assign Team Setup</h3>

            {/* HEAD COACH */}
            <div>
              <div>Head Coach</div>
              <select
                value={activeTeam.coach_id || ""}
                onChange={(e) =>
                  updateTeam("coach_id", e.target.value)
                }
              >
                <option value="">Select</option>
                {coaches
                  .filter(c => c.status === "approved")
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
              </select>
            </div>

            {/* ASSISTANT */}
            <div>
              <div>Assistant Coach</div>
              <select
                value={activeTeam.assistant_coach_id || ""}
                onChange={(e) =>
                  updateTeam("assistant_coach_id", e.target.value)
                }
              >
                <option value="">Select</option>
                {coaches
                  .filter(c => c.status === "approved")
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
              </select>
            </div>

            {/* DIVISION */}
            <div>
              <div>Division</div>
              <select
                value={activeTeam.division || ""}
                onChange={(e) =>
                  updateTeam("division", e.target.value)
                }
              >
                <option value="K-1">K-1</option>
                <option value="2nd-3rd">2nd-3rd</option>
                <option value="4th-5th">4th-5th</option>
                <option value="6th+">6th+</option>
              </select>
            </div>

            <button onClick={() => setShowAssign(false)}>Close</button>
          </div>
        )}

      </div>
    );
  }

  /* ================= MAIN ================= */

  return (
    <div>

      <h1>Teams</h1>

      <div style={grid}>
        {teams.map(t => {
          const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

          return (
            <div key={t.id} style={tile} onClick={() => setActiveTeam(t)}>
              <img src={teamLogos[nfl?.short_name]} width={50} />
              <div>{nfl?.full_name}</div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 15
};

const tile = {
  background: "#fff",
  padding: 10,
  borderRadius: 10,
  textAlign: "center",
  cursor: "pointer"
};

const popup = {
  marginTop: 20,
  padding: 20,
  background: "#fff",
  borderRadius: 10,
  border: "1px solid #ddd"
};
