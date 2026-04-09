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
  const [divisions, setDivisions] = useState([]);

  const [creatingTeam, setCreatingTeam] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: c } = await supabase.from("coaches").select("*");
    const { data: d } = await supabase.from("divisions").select("*");
    const { data: p } = await supabase.from("players").select("*");

    setNflTeams(nfl || []);
    setTeams(t || []);
    setCoaches(c || []);
    setPlayers(p || []);
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
      .filter(p =>
        !p.team_id &&
        p.division_id === division.id
      )
      .map(p => ({
        ...p,
        rating: Number(p.rating || 3)
      }))
      .sort((a, b) => b.rating - a.rating);

    console.log("FOUND PLAYERS:", divisionPlayers.length);

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

    alert("Auto roster complete!");
    loadData();
  };

  /* ================= CREATE TEAM ================= */

  if (creatingTeam) {
    return (
      <div style={{ padding: 20 }}>

        <button style={backBtn} onClick={() => setCreatingTeam(null)}>
          ← Teams
        </button>

        <h2>Create Team</h2>

        {/* ✅ LOGO + NAME RESTORED */}
        <div style={teamHero}>
          <img src={teamLogos[creatingTeam.short_name]} width={90}/>
          <h1>{creatingTeam.full_name}</h1>
        </div>

        <div style={formBox}>

          <select
            style={formInput}
            onChange={(e) => {
              const division = divisions.find(d => d.id === e.target.value);

              setCreatingTeam({
                ...creatingTeam,
                division_id: division.id,
                division_name: division.name
              });
            }}
          >
            <option value="">Select Division</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            style={formInput}
            onChange={(e) =>
              setCreatingTeam({
                ...creatingTeam,
                coach_id: e.target.value
              })
            }
          >
            <option value="">Head Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <select
            style={formInput}
            onChange={(e) =>
              setCreatingTeam({
                ...creatingTeam,
                assistant_coach_id: e.target.value
              })
            }
          >
            <option value="">Assistant Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <button
            style={primaryBtn}
            onClick={async () => {

              if (!creatingTeam.division_id) {
                alert("Select division");
                return;
              }

              await supabase.from("teams").insert({
                nfl_team_id: creatingTeam.id,
                division_id: creatingTeam.division_id,
                division: creatingTeam.division_name,
                coach_id: creatingTeam.coach_id || null,
                assistant_coach_id: creatingTeam.assistant_coach_id || null
              });

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

        if (!divTeams.length) return null;

        return (
          <div key={div.id} style={divisionTile}>

            <div style={divisionHeaderRow}>
              <strong>{div.name}</strong>

              <div
                style={autoTile}
                onClick={() => autoRosterByDivision(div)}
              >
                ⚡ Auto Roster
              </div>
            </div>

            <div style={grid}>
              {divTeams.map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);
                const count = players.filter(p => p.team_id === t.id).length;

                return (
                  <div key={t.id} style={tile}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
                    <div style={{ fontSize: 11 }}>
                      Coach: {getCoachName(t.coach_id)}
                    </div>
                    <div style={{ fontSize: 11 }}>
                      Asst: {getCoachName(t.assistant_coach_id)}
                    </div>
                    <div>{count} Players</div>
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
const divisionHeaderRow = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 };

const autoTile = { background:"#2f6ea6", color:"#fff", padding:"6px 12px", borderRadius:8, cursor:"pointer" };

const formBox = { background:"#fff", padding:20, borderRadius:12 };
const formInput = { width:"100%", padding:8, marginBottom:10 };

const primaryBtn = { background:"#2f6ea6", color:"#fff", border:"none", padding:"8px 14px", borderRadius:8 };

const backBtn = { marginBottom:15 };

const teamHero = { display:"flex", gap:20, alignItems:"center" };
