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
  const [playerSearch, setPlayerSearch] = useState("");
  const [newTeam, setNewTeam] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: c } = await supabase.from("coaches").select("*");
    const { data: p } = await supabase
      .from("players")
      .select("*, divisions(name)");

    setNflTeams(nfl || []);
    setTeams(t || []);
    setCoaches(c || []);
    setPlayers(p || []);
  };

  const getCoachName = (id) => {
    const c = coaches.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  /* ================= REMOVE PLAYER ================= */

  const removeFromTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: null })
      .eq("id", playerId);

    loadData();
  };

  /* ================= ADD PLAYER ================= */

  const addPlayerToTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: activeTeam.id })
      .eq("id", playerId);

    loadData();
  };

  /* ================= AUTO ROSTER ================= */

  const autoRoster = async () => {
    const divisionPlayers = players.filter(
      p =>
        !p.team_id &&
        p.divisions?.name === activeTeam.division
    );

    const divisionTeams = teams.filter(
      t => t.division === activeTeam.division
    );

    if (!divisionTeams.length) {
      alert("No teams in this division");
      return;
    }

    let teamIndex = 0;

    for (let p of divisionPlayers) {
      const team = divisionTeams[teamIndex];

      await supabase
        .from("players")
        .update({ team_id: team.id })
        .eq("id", p.id);

      teamIndex++;
      if (teamIndex >= divisionTeams.length) teamIndex = 0;
    }

    loadData();
  };

  /* ================= CREATE TEAM ================= */

  const createTeam = (nflTeamId) => {
    setNewTeam({
      nfl_team_id: nflTeamId,
      division: "",
      coach_id: "",
      assistant_coach_id: ""
    });
  };

  const saveTeam = async () => {
    if (!newTeam.division) {
      alert("Select a division");
      return;
    }

    const { error } = await supabase.from("teams").insert([
      {
        nfl_team_id: newTeam.nfl_team_id,
        division: newTeam.division,
        coach_id: newTeam.coach_id || null,
        assistant_coach_id: newTeam.assistant_coach_id || null
      }
    ]);

    if (error) {
      console.error(error);
      alert("Failed to create team");
      return;
    }

    setNewTeam(null);
    loadData();
  };

  /* ================= TEAM VIEW ================= */

  if (activeTeam) {
    const nfl = nflTeams.find(n => n.id === activeTeam.nfl_team_id);
    const teamPlayers = players.filter(p => p.team_id === activeTeam.id);

    return (
      <div>

        <button style={backBtn} onClick={() => setActiveTeam(null)}>
          ← Back to Teams
        </button>

        <div style={teamHero}>
          <img src={teamLogos[nfl?.short_name]} width={90} />
          <div>
            <h1>{nfl?.full_name}</h1>
            <div style={divisionBadge}>{activeTeam.division}</div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: 10 }}>
          <button style={saveBtn} onClick={() => setShowAdd(true)}>
            + Add Player
          </button>

          <button style={saveBtn} onClick={autoRoster}>
            ⚡ Auto Roster
          </button>
        </div>

        {/* ADD PLAYER PANEL */}
        {showAdd && (
          <div style={formBox}>

            <h3>Add Player</h3>

            {players
              .filter(p =>
                !p.team_id &&
                p.divisions?.name === activeTeam.division
              )
              .map(p => (
                <div key={p.id} style={playerRow}>
                  <div>{p.first_name} {p.last_name}</div>

                  <button
                    style={saveBtn}
                    onClick={() => addPlayerToTeam(p.id)}
                  >
                    Add
                  </button>
                </div>
              ))}

            <button style={cancelBtn} onClick={() => setShowAdd(false)}>
              Close
            </button>

          </div>
        )}

        {/* PLAYER LIST */}
        <div style={{ marginTop: 20 }}>
          {teamPlayers.map(p => (
            <div key={p.id} style={playerRow}>
              <div>
                {p.first_name} {p.last_name}
              </div>

              <button
                style={removeBtn}
                onClick={() => removeFromTeam(p.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

      </div>
    );
  }

  /* ================= MAIN ================= */

  return (
    <div>

      <h1>Teams Manager</h1>

      <h3>Select NFL Team (Click to Add)</h3>

      <div style={grid}>
        {nflTeams.map(team => (
          <div
            key={team.id}
            style={tile}
            onClick={() => createTeam(team.id)}
          >
            <img src={teamLogos[team.short_name]} width={60}/>
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

      {newTeam && (
        <div style={formBox}>
          <h3>Add Team</h3>

          <select style={formInput}
            value={newTeam.division}
            onChange={(e) =>
              setNewTeam({ ...newTeam, division: e.target.value })
            }
          >
            <option value="">Select Division</option>
            <option value="K-1">K-1</option>
            <option value="2nd-3rd">2nd-3rd</option>
            <option value="4th-5th">4th-5th</option>
            <option value="6th-8th">6th-8th</option>
          </select>

          <select style={formInput}
            value={newTeam.coach_id}
            onChange={(e) =>
              setNewTeam({ ...newTeam, coach_id: e.target.value })
            }
          >
            <option value="">Head Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <select style={formInput}
            value={newTeam.assistant_coach_id}
            onChange={(e) =>
              setNewTeam({ ...newTeam, assistant_coach_id: e.target.value })
            }
          >
            <option value="">Assistant Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={saveBtn} onClick={saveTeam}>Save</button>
            <button style={cancelBtn} onClick={() => setNewTeam(null)}>Cancel</button>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 30 }}>Assigned Teams</h3>

      {["K-1","2nd-3rd","4th-5th","6th-8th"].map(div => {
        const divTeams = teams.filter(t => t.division === div);
        if (!divTeams.length) return null;

        return (
          <div key={div} style={divisionTile}>
            <div style={divisionHeader}>{div}</div>

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

const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:15 };
const tile = { background:"#fff", borderRadius:12, padding:10, textAlign:"center", cursor:"pointer" };
const divisionTile = { background:"#fff", borderRadius:14, padding:15, marginBottom:20 };
const divisionHeader = { fontWeight:"600", marginBottom:10 };
const formBox = { background:"#fff", padding:20, borderRadius:12, marginTop:20, maxWidth:400 };
const formInput = { width:"100%", padding:"8px", marginBottom:10, borderRadius:8, border:"1px solid #e2e8f0" };
const saveBtn = { background:"#2f6ea6", color:"#fff", border:"none", padding:"8px 14px", borderRadius:8, cursor:"pointer" };
const cancelBtn = { background:"#e5e7eb", border:"none", padding:"8px 14px", borderRadius:8, cursor:"pointer" };
const removeBtn = { background:"#ef4444", color:"#fff", border:"none", padding:"6px 10px", borderRadius:6, cursor:"pointer" };
const backBtn = { marginBottom:15, padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", cursor:"pointer" };
const teamHero = { display:"flex", alignItems:"center", gap:20, marginBottom:20 };
const divisionBadge = { background:"#e2e8f0", padding:"4px 10px", borderRadius:8 };
const playerRow = { display:"flex", justifyContent:"space-between", padding:"10px", borderBottom:"1px solid #e5e7eb" };
