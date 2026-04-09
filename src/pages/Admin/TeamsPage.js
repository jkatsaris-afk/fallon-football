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

  /* ================= SMART AUTO ROSTER ================= */

  const autoRosterByDivision = async (division) => {
    const divisionTeams = teams.filter(t => t.division === division);

    if (!divisionTeams.length) {
      alert("No teams in this division");
      return;
    }

    const divisionPlayers = players
      .filter(p =>
        !p.team_id &&
        p.divisions?.name === division
      )
      .sort((a, b) => (b.rating || 3) - (a.rating || 3));

    const teamBuckets = divisionTeams.map(t => ({
      team: t,
      total: 0,
      players: []
    }));

    for (let player of divisionPlayers) {
      teamBuckets.sort((a, b) => a.total - b.total);

      const target = teamBuckets[0];

      target.players.push(player);
      target.total += player.rating || 3;
    }

    for (let bucket of teamBuckets) {
      for (let p of bucket.players) {
        await supabase
          .from("players")
          .update({ team_id: bucket.team.id })
          .eq("id", p.id);
      }
    }

    loadData();
  };

  const removeFromTeam = async (id) => {
    await supabase.from("players").update({ team_id: null }).eq("id", id);
    loadData();
  };

  const addPlayerToTeam = async (id) => {
    await supabase.from("players").update({ team_id: activeTeam.id }).eq("id", id);
    loadData();
  };

  /* ================= TEAM DASHBOARD ================= */

  if (activeTeam) {
    const nfl = nflTeams.find(n => n.id === activeTeam.nfl_team_id);
    const teamPlayers = players.filter(p => p.team_id === activeTeam.id);

    return (
      <div style={{ padding: 20 }}>

        <button style={backBtnModern} onClick={() => setActiveTeam(null)}>
          ← Teams
        </button>

        <h2>Team Dashboard</h2>

        <div style={dashboardCard}>
          <div style={leftSide}>
            <img src={teamLogos[nfl?.short_name]} style={teamLogoWide} />
            <div>
              <h1>{nfl?.full_name}</h1>
              <div style={divisionBadge}>
                {activeTeam.division} • {teamPlayers.length} Players
              </div>
            </div>
          </div>

          <div style={coachPanel}>
            <div style={coachTitle}>Coaching Staff</div>
            <div style={coachRow}>
              <span style={coachLabel}>Head Coach</span>
              <span>{getCoachName(activeTeam.coach_id)}</span>
            </div>
            <div style={coachRow}>
              <span style={coachLabel}>Assistant</span>
              <span>{getCoachName(activeTeam.assistant_coach_id)}</span>
            </div>
          </div>
        </div>

        <div style={actionBar}>
          <button style={primaryBtn} onClick={() => setShowAdd(true)}>+ Add Player</button>
        </div>

        {showAdd && (
          <div style={panel}>
            <h3>Add Player</h3>

            <input
              placeholder="Search players..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              style={formInput}
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
                <div key={p.id} style={row}>
                  <div>{p.first_name} {p.last_name}</div>
                  <button style={primaryBtn} onClick={() => addPlayerToTeam(p.id)}>Add</button>
                </div>
              ))}

            <button style={secondaryBtn} onClick={() => setShowAdd(false)}>
              Close
            </button>
          </div>
        )}

        <div style={table}>
          {teamPlayers.map(p => (
            <div key={p.id} style={tableRow}>
              <div>{p.first_name} {p.last_name}</div>
              <button style={removeBtn} onClick={() => removeFromTeam(p.id)}>Remove</button>
            </div>
          ))}
        </div>

      </div>
    );
  }

  /* ================= MAIN ================= */

  return (
    <div style={{ padding: 20 }}>

      <h1>Teams Manager</h1>

      <div style={grid}>
        {nflTeams.map(team => (
          <div key={team.id} style={tile} onClick={() => setCreatingTeam(team)}>
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
            <div style={divisionHeaderRow}>
              <div>{div}</div>

              <button
                style={secondaryBtn}
                onClick={() => autoRosterByDivision(div)}
              >
                Auto Roster
              </button>
            </div>

            <div style={grid}>
              {divTeams.map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);
                const count = players.filter(p => p.team_id === t.id).length;

                return (
                  <div key={t.id} style={tile} onClick={() => setActiveTeam(t)}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
                    <div style={{ fontSize: 11 }}>
                      Coach: {getCoachName(t.coach_id)}
                    </div>
                    <div style={{ fontSize: 11 }}>
                      Asst: {getCoachName(t.assistant_coach_id)}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      {count} Players
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

const backBtnModern = {
  background:"#fff",
  border:"1px solid #e5e7eb",
  padding:"6px 12px",
  borderRadius:10,
  cursor:"pointer",
  marginBottom:15
};

const primaryBtn = {
  background:"#2f6ea6",
  color:"#fff",
  border:"none",
  padding:"8px 14px",
  borderRadius:8
};

const secondaryBtn = {
  background:"#e5e7eb",
  border:"none",
  padding:"6px 12px",
  borderRadius:8,
  cursor:"pointer"
};

const dashboardCard = { display:"flex", justifyContent:"space-between", background:"#fff", padding:20, borderRadius:16 };
const leftSide = { display:"flex", gap:20, alignItems:"center" };
const teamLogoWide = { width:120 };

const coachPanel = { background:"#f8fafc", padding:15, borderRadius:12, minWidth:220 };
const coachTitle = { fontWeight:"600", marginBottom:8 };
const coachRow = { display:"flex", justifyContent:"space-between" };
const coachLabel = { color:"#64748b" };

const divisionBadge = { background:"#e2e8f0", padding:"4px 10px", borderRadius:8 };

const actionBar = { display:"flex", gap:10, marginTop:20 };
const panel = { background:"#fff", padding:20, borderRadius:12, marginTop:20 };

const table = { background:"#fff", borderRadius:12, marginTop:20 };
const tableRow = { display:"flex", justifyContent:"space-between", padding:12 };

const row = { display:"flex", justifyContent:"space-between", padding:10 };

const formInput = { width:"100%", padding:8, marginBottom:10 };

const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:15 };
const tile = { background:"#fff", borderRadius:12, padding:10, textAlign:"center", cursor:"pointer" };

const divisionTile = { background:"#fff", borderRadius:14, padding:15, marginBottom:20 };
const divisionHeaderRow = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 };
