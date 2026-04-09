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
  const [creatingTeam, setCreatingTeam] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
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

  /* ================= CREATE TEAM SCREEN ================= */

  if (creatingTeam) {
    return (
      <div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={backBtn} onClick={() => setCreatingTeam(null)}>
            ← Back
          </button>
          <h2 style={{ margin: 0 }}>Create Team</h2>
        </div>

        <div style={teamHero}>
          <img src={teamLogos[creatingTeam.short_name]} width={90} />
          <div>
            <h1>{creatingTeam.full_name}</h1>
          </div>
        </div>

        <div style={formBox}>

          {/* DIVISION */}
          <select
            style={formInput}
            value={creatingTeam.division || ""}
            onChange={(e) =>
              setCreatingTeam({
                ...creatingTeam,
                division: e.target.value
              })
            }
          >
            <option value="">Select Division</option>
            <option value="K-1">K-1</option>
            <option value="2nd-3rd">2nd-3rd</option>
            <option value="4th-5th">4th-5th</option>
            <option value="6th-8th">6th-8th</option>
          </select>

          {/* HEAD COACH */}
          <select
            style={formInput}
            value={creatingTeam.coach_id || ""}
            onChange={(e) =>
              setCreatingTeam({
                ...creatingTeam,
                coach_id: e.target.value
              })
            }
          >
            <option value="">Select Head Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          {/* ASSISTANT COACH */}
          <select
            style={formInput}
            value={creatingTeam.assistant_coach_id || ""}
            onChange={(e) =>
              setCreatingTeam({
                ...creatingTeam,
                assistant_coach_id: e.target.value
              })
            }
          >
            <option value="">Select Assistant Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          {/* SAVE */}
          <button
            style={saveBtn}
            onClick={async () => {
              if (!creatingTeam.division) {
                alert("Select a division");
                return;
              }

              const { error } = await supabase
                .from("teams")
                .insert({
                  nfl_team_id: creatingTeam.id,
                  division: creatingTeam.division,
                  coach_id: creatingTeam.coach_id || null,
                  assistant_coach_id: creatingTeam.assistant_coach_id || null
                });

              if (error) {
                console.error(error);
                alert("Failed to create team");
                return;
              }

              setCreatingTeam(null);
              loadData();
            }}
          >
            Create Team
          </button>

        </div>

      </div>
    );
  }

  /* ================= MAIN ================= */

  return (
    <div>

      <h1>Teams Manager</h1>

      <h3>Select NFL Team (Click to Create Team)</h3>

      <div style={grid}>
        {nflTeams.map(team => (
          <div
            key={team.id}
            style={tile}
            onClick={() => setCreatingTeam(team)}
          >
            <img src={teamLogos[team.short_name]} width={60}/>
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

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
                const playerCount = players.filter(p => p.team_id === t.id).length;

                return (
                  <div key={t.id} style={tile}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
                    <div style={{ fontSize: 11 }}>
                      Coach: {getCoachName(t.coach_id)}
                    </div>
                    <div style={{ fontSize: 11, color:"#64748b" }}>
                      Asst: {getCoachName(t.assistant_coach_id)}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {playerCount} Players
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
const backBtn = { marginBottom:15, padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", cursor:"pointer" };
const teamHero = { display:"flex", alignItems:"center", gap:20, marginBottom:20 };
