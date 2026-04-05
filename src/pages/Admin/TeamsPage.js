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

  // ✅ NEW CREATE FLOW
  const [selectedNFL, setSelectedNFL] = useState(null);
  const [newDivision, setNewDivision] = useState("");
  const [newCoach, setNewCoach] = useState("");
  const [newAssistant, setNewAssistant] = useState("");

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

  /* ================= CREATE TEAM ================= */

  const createTeam = async () => {
    if (!selectedNFL || !newDivision) {
      alert("Select team and division");
      return;
    }

    const { error } = await supabase.from("teams").insert({
      nfl_team_id: selectedNFL.id,
      division: newDivision,
      coach_id: newCoach || null,
      assistant_coach_id: newAssistant || null
    });

    if (error) {
      console.error(error);
      alert("Failed to create team");
      return;
    }

    setSelectedNFL(null);
    setNewDivision("");
    setNewCoach("");
    setNewAssistant("");

    loadData();
  };

  /* ================= PLAYER ACTIONS ================= */

  const addPlayerToTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: activeTeam.id })
      .eq("id", playerId);

    loadData();
  };

  const removePlayerFromTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: null })
      .eq("id", playerId);

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

        <div>
          <div>Head Coach: {getCoachName(activeTeam.coach_id)}</div>
          <div>Assistant: {getCoachName(activeTeam.assistant_coach_id)}</div>
        </div>

        <button onClick={() => setShowAdd(true)}>Add Player</button>

        {/* ADD PLAYER */}
        {showAdd && (
          <div>
            <h3>Add Player</h3>

            {players
              .filter(p => p.division === activeTeam.division && !p.team_id)
              .map(p => (
                <div key={p.id}>
                  {p.first_name} {p.last_name}
                  <button onClick={() => addPlayerToTeam(p.id)}>Add</button>
                </div>
              ))}
          </div>
        )}

      </div>
    );
  }

  /* ================= MAIN ================= */

  return (
    <div>

      <h1>Teams Manager</h1>

      {/* ================= SELECT NFL ================= */}
      <h3>Select NFL Team</h3>

      <div style={grid}>
        {nflTeams.map(team => (
          <div
            key={team.id}
            style={tile}
            onClick={() => setSelectedNFL(team)}
          >
            <img src={teamLogos[team.short_name]} width={60}/>
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

      {/* ================= CREATE TEAM ================= */}

      {selectedNFL && (
        <div style={createBox}>

          <h3>Create Team: {selectedNFL.full_name}</h3>

          <div>
            <div>Division</div>
            <select value={newDivision} onChange={(e)=>setNewDivision(e.target.value)}>
              <option value="">Select</option>
              <option value="K-1">K-1</option>
              <option value="2nd-3rd">2nd-3rd</option>
              <option value="4th-5th">4th-5th</option>
              <option value="6th+">6th+</option>
            </select>
          </div>

          <div>
            <div>Head Coach</div>
            <select value={newCoach} onChange={(e)=>setNewCoach(e.target.value)}>
              <option value="">Select</option>
              {coaches.filter(c => c.status === "approved").map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div>Assistant Coach</div>
            <select value={newAssistant} onChange={(e)=>setNewAssistant(e.target.value)}>
              <option value="">Select</option>
              {coaches.filter(c => c.status === "approved").map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}
                </option>
              ))}
            </select>
          </div>

          <button style={btn} onClick={createTeam}>
            Create Team
          </button>

        </div>
      )}

      {/* ================= ASSIGNED TEAMS ================= */}

      <h3 style={{ marginTop: 30 }}>Assigned Teams</h3>

      {["K-1","2nd-3rd","4th-5th","6th+"].map(div => {
        const divTeams = teams.filter(t => t.division === div);
        if (divTeams.length === 0) return null;

        return (
          <div key={div}>
            <h4>{div}</h4>

            <div style={grid}>
              {divTeams.map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

                return (
                  <div key={t.id} style={tile} onClick={()=>setActiveTeam(t)}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
                    <div style={{ fontSize: 11 }}>{getCoachName(t.coach_id)}</div>
                    <div style={{ fontSize: 11, color:"#64748b" }}>
                      {getCoachName(t.assistant_coach_id)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

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

const createBox = {
  marginTop: 20,
  padding: 15,
  background: "#fff",
  borderRadius: 10
};

const btn = {
  marginTop: 10,
  padding: "10px 14px",
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 8
};
