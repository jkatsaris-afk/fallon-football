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

  /* ================= 🔥 NEW: AUTO ROSTER BY DIVISION ================= */

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

  /* ================= CREATE TEAM ================= */

  if (creatingTeam) {
    return (
      <div style={{ padding: 20 }}>
        <button style={backBtnModern} onClick={() => setCreatingTeam(null)}>
          ← Teams
        </button>

        <h2>Create Team</h2>

        <div style={teamHero}>
          <img src={teamLogos[creatingTeam.short_name]} width={90} />
          <h1>{creatingTeam.full_name}</h1>
        </div>

        <div style={formBox}>
          <select style={formInput}
            onChange={(e) => setCreatingTeam({ ...creatingTeam, division: e.target.value })}
          >
            <option value="">Select Division</option>
            <option value="K-1">K-1</option>
            <option value="2nd-3rd">2nd-3rd</option>
            <option value="4th-5th">4th-5th</option>
            <option value="6th-8th">6th-8th</option>
          </select>

          <select style={formInput}
            onChange={(e) => setCreatingTeam({ ...creatingTeam, coach_id: e.target.value })}
          >
            <option value="">Head Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>

          <select style={formInput}
            onChange={(e) => setCreatingTeam({ ...creatingTeam, assistant_coach_id: e.target.value })}
          >
            <option value="">Assistant Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </select>

          <button style={primaryBtn} onClick={async () => {
            if (!creatingTeam.division) return alert("Select division");

            await supabase.from("teams").insert({
              nfl_team_id: creatingTeam.id,
              division: creatingTeam.division,
              coach_id: creatingTeam.coach_id || null,
              assistant_coach_id: creatingTeam.assistant_coach_id || null
            });

            setCreatingTeam(null);
            loadData();
          }}>
            Create Team
          </button>
        </div>
      </div>
    );
  }

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
          <button style={primaryBtn} onClick={autoRoster}>Auto Roster</button>
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
                    <div style={{ fontSize: 11 }}>Asst: {getCoachName(t.assistant_coach_id)}</div>
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

const autoTile = {
  background:"#2f6ea6",
  color:"#fff",
  borderRadius:12,
  padding:10,
  textAlign:"center",
  cursor:"pointer",
  fontWeight:"600"
};
