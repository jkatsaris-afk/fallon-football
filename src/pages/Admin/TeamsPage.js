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
  const [newTeam, setNewTeam] = useState(null);

  // ✅ ONLY ADDITION
  const [playerSearch, setPlayerSearch] = useState("");

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

  const removeFromTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: null })
      .eq("id", playerId);

    loadData();
  };

  const addPlayerToTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: activeTeam.id })
      .eq("id", playerId);

    loadData();
  };

  const autoRoster = async () => {
    const divisionPlayers = players.filter(
      p =>
        !p.team_id &&
        p.divisions?.name === activeTeam.division
    );

    const divisionTeams = teams.filter(
      t => t.division === activeTeam.division
    );

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

        <div style={{ display: "flex", gap: 10 }}>
          <button style={saveBtn} onClick={() => setShowAdd(true)}>
            + Add Player
          </button>

          <button style={saveBtn} onClick={autoRoster}>
            ⚡ Auto Roster
          </button>
        </div>

        {showAdd && (
          <div style={formBox}>

            <h3>Add Player</h3>

            {/* ✅ SEARCH ADDED */}
            <input
              placeholder="Search players..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                marginBottom: 10,
                borderRadius: 8,
                border: "1px solid #e2e8f0"
              }}
            />

            {players
              .filter(p =>
                !p.team_id &&
                p.divisions?.name === activeTeam.division &&
                `${p.first_name} ${p.last_name}`
                  .toLowerCase()
                  .includes(playerSearch.toLowerCase())
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

        <div style={{ marginTop: 20 }}>
          {teamPlayers.map(p => (
            <div key={p.id} style={playerRow}>
              <div>{p.first_name} {p.last_name}</div>

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

  return (
    <div>
      <h1>Teams Manager</h1>
      {/* YOUR ORIGINAL MAIN VIEW STAYS HERE */}
    </div>
  );
}

/* ================= STYLES ================= */

const saveBtn = { background:"#2f6ea6", color:"#fff", border:"none", padding:"8px 14px", borderRadius:8, cursor:"pointer" };
const cancelBtn = { background:"#e5e7eb", border:"none", padding:"8px 14px", borderRadius:8, cursor:"pointer" };
const removeBtn = { background:"#ef4444", color:"#fff", border:"none", padding:"6px 10px", borderRadius:6, cursor:"pointer" };
const backBtn = { marginBottom:15, padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", cursor:"pointer" };
const teamHero = { display:"flex", alignItems:"center", gap:20, marginBottom:20 };
const divisionBadge = { background:"#e2e8f0", padding:"4px 10px", borderRadius:8 };
const playerRow = { display:"flex", justifyContent:"space-between", padding:"10px", borderBottom:"1px solid #e5e7eb" };
const formBox = { background:"#fff", padding:20, borderRadius:12, marginTop:20, maxWidth:400 };
