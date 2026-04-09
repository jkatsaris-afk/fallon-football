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
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const [creatingTeam, setCreatingTeam] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: p } = await supabase.from("players").select("*");
    const { data: c } = await supabase.from("coaches").select("*");
    const { data: d } = await supabase.from("divisions").select("*");

    setNflTeams(nfl || []);
    setTeams(t || []);
    setPlayers(p || []);
    setCoaches(c || []);
    setDivisions(d || []);
  };

  const getCoachName = (id) => {
    const c = coaches.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  /* ================= AUTO ROSTER ================= */

  const autoRosterByDivision = async (division) => {

    const divisionTeams = teams.filter(t => t.division_id === division.id);

    const divisionPlayers = players
      .filter(p => !p.team_id && p.division_id === division.id)
      .map(p => ({
        ...p,
        rating: Number(p.rating || 3)
      }))
      .sort((a, b) => b.rating - a.rating);

    if (!divisionPlayers.length) {
      alert("No players available");
      return;
    }

    const buckets = divisionTeams.map(t => ({
      team: t,
      total: 0,
      players: []
    }));

    for (let player of divisionPlayers) {
      buckets.sort((a, b) => a.total - b.total);
      const target = buckets[0];

      target.players.push(player);
      target.total += player.rating;
    }

    for (let bucket of buckets) {
      for (let p of bucket.players) {
        await supabase
          .from("players")
          .update({ team_id: bucket.team.id })
          .eq("id", p.id);
      }
    }

    loadData();
  };

  /* ================= TEAM DASHBOARD ================= */

  if (activeTeam) {
    const nfl = nflTeams.find(n => n.id === activeTeam.nfl_team_id);
    const teamPlayers = players.filter(p => p.team_id === activeTeam.id);

    return (
      <div style={{ padding: 20 }}>
        <button onClick={() => setActiveTeam(null)}>← Back</button>

        <h2>{nfl?.full_name}</h2>
        <img src={teamLogos[nfl?.short_name]} width={120} />

        <h3>Players ({teamPlayers.length})</h3>

        {teamPlayers.map(p => (
          <div key={p.id}>{p.first_name} {p.last_name}</div>
        ))}
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

      {divisions.map(div => {
        const divTeams = teams.filter(t => t.division_id === div.id);

        return (
          <div key={div.id} style={divisionTile}>

            <div style={divisionHeader}>{div.name}</div>

            <div style={grid}>

              <div style={autoTile} onClick={() => autoRosterByDivision(div)}>
                ⚡ Auto Roster
              </div>

              {divTeams.map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

                return (
                  <div key={t.id} style={tile} onClick={() => setActiveTeam(t)}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
                    <div>{getCoachName(t.coach_id)}</div>
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
  display:"grid",
  gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))",
  gap:15
};

const tile = {
  background:"#fff",
  borderRadius:12,
  padding:10,
  textAlign:"center",
  cursor:"pointer"
};

const divisionTile = {
  background:"#fff",
  borderRadius:14,
  padding:15,
  marginBottom:20
};

const divisionHeader = {
  fontWeight:"600",
  marginBottom:10
};

const autoTile = {
  background:"#2f6ea6",
  color:"#fff",
  padding:"10px",
  borderRadius:12,
  cursor:"pointer",
  textAlign:"center"
};
