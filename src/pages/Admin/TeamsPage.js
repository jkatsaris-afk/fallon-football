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

  const removeFromTeam = async (playerId) => {
    await supabase.from("players").update({ team_id: null }).eq("id", playerId);
    loadData();
  };

  const addPlayerToTeam = async (playerId) => {
    await supabase.from("players").update({ team_id: activeTeam.id }).eq("id", playerId);
    loadData();
  };

  const autoRoster = async () => {
    const divisionPlayers = players.filter(
      p => !p.team_id && p.divisions?.name === activeTeam.division
    );

    const divisionTeams = teams.filter(
      t => t.division === activeTeam.division
    );

    let i = 0;
    for (let p of divisionPlayers) {
      const team = divisionTeams[i];

      await supabase.from("players").update({ team_id: team.id }).eq("id", p.id);

      i++;
      if (i >= divisionTeams.length) i = 0;
    }

    loadData();
  };

  /* ================= AUTO ROSTER BY DIVISION ================= */

  const autoRosterDivision = async (division) => {

    const divisionPlayers = players.filter(
      p => !p.team_id && p.divisions?.name === division
    );

    const divisionTeams = teams.filter(
      t => t.division === division
    );

    if (!divisionPlayers.length) {
      alert("No players available");
      return;
    }

    let i = 0;

    for (let p of divisionPlayers) {
      const team = divisionTeams[i];

      await supabase
        .from("players")
        .update({ team_id: team.id })
        .eq("id", p.id);

      i++;
      if (i >= divisionTeams.length) i = 0;
    }

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
        </div>

        <div style={actionBar}>
          <button style={primaryBtn} onClick={() => setShowAdd(true)}>+ Add Player</button>
          <button style={primaryBtn} onClick={autoRoster}>Auto Roster</button>
        </div>

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

      <h3 style={{ marginTop: 30 }}>Assigned Teams</h3>

      {["K-1","2nd-3rd","4th-5th","6th-8th"].map(div => {
        const divTeams = teams.filter(t => t.division === div);

        return (
          <div key={div} style={divisionTile}>

            <div style={divisionHeader}>{div}</div>

            <div style={grid}>

              {/* 🔥 AUTO ROSTER TILE */}
              <div
                style={autoTile}
                onClick={() => autoRosterDivision(div)}
              >
                ⚡ Auto Roster
              </div>

              {divTeams.map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);
                const count = players.filter(p => p.team_id === t.id).length;

                return (
                  <div key={t.id} style={tile} onClick={() => setActiveTeam(t)}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
                    <div style={{ fontSize: 11 }}>Coach: {getCoachName(t.coach_id)}</div>
                    <div style={{ fontSize: 12 }}>{count} Players</div>
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
  borderRadius: 12,
  padding: 10,
  textAlign: "center",
  cursor: "pointer"
};

const divisionTile = {
  background: "#fff",
  borderRadius: 14,
  padding: 15,
  marginBottom: 20
};

const divisionHeader = {
  fontWeight: "600",
  marginBottom: 10
};

const autoTile = {
  background:"#2f6ea6",
  color:"#fff",
  borderRadius:12,
  padding:10,
  textAlign:"center",
  cursor:"pointer",
  fontWeight:"600"
};
