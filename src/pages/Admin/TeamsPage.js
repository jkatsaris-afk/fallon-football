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

const teamLogos = {
  bills, bengals, broncos, lions, colts,
  chiefs, raiders, rams, jets, eagles,
  steelers, "49ers": niners
};

export default function TeamsPage() {
  const [nflTeams, setNflTeams] = useState([]);
  const [teams, setTeams] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [players, setPlayers] = useState([]);

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);

  const [division, setDivision] = useState("");
  const [coach, setCoach] = useState("");

  const [showMove, setShowMove] = useState(false);
  const [targetTeam, setTargetTeam] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");

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

  /* ================= TEAM ASSIGN ================= */

  const assignTeam = async () => {
    if (!selectedTeam || !division || !coach) {
      alert("Select division and coach");
      return;
    }

    await supabase.from("teams").insert([{
      nfl_team_id: selectedTeam.id,
      division,
      coach_id: coach,
      season_id: 2026
    }]);

    loadData();
    setSelectedTeam(null);
  };

  /* ================= AUTO ================= */

  const autoAssign = async () => {
    const available = players.filter(
      p => p.division === activeTeam.division && !p.team_id
    );

    const divisionTeams = teams.filter(
      t => t.division === activeTeam.division
    );

    const perTeam = Math.ceil(available.length / divisionTeams.length);
    const assign = available.slice(0, perTeam);

    for (let p of assign) {
      await supabase.from("players")
        .update({ team_id: activeTeam.id })
        .eq("id", p.id);
    }

    loadData();
  };

  /* ================= CLEAR ================= */

  const clearTeam = async () => {
    await supabase.from("players")
      .update({ team_id: null })
      .eq("team_id", activeTeam.id);

    loadData();
  };

  /* ================= MOVE ================= */

  const movePlayers = async () => {
    await supabase.from("players")
      .update({ team_id: targetTeam })
      .eq("team_id", activeTeam.id);

    setShowMove(false);
    loadData();
  };

  /* ================= ADD PLAYER ================= */

  const addPlayer = async () => {
    await supabase.from("players")
      .update({ team_id: activeTeam.id })
      .eq("id", selectedPlayer);

    setShowAdd(false);
    setSelectedPlayer("");
    loadData();
  };

  return (
    <div>

      <h1>Teams Manager</h1>

      {/* ================= TEAM SELECT ================= */}

      <div style={grid}>
        {nflTeams.map(team => (
          <div
            key={team.id}
            style={tile}
            onClick={() => setSelectedTeam(team)}
          >
            <img src={teamLogos[team.short_name]} width={60}/>
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

      {/* ================= ASSIGN ================= */}

      {selectedTeam && (
        <div style={panel}>
          <h3>{selectedTeam.full_name}</h3>

          <select onChange={(e)=>setDivision(e.target.value)}>
            <option value="">Division</option>
            <option>K-1</option>
            <option>2nd-3rd</option>
            <option>4th-5th</option>
            <option>6th+</option>
          </select>

          <select onChange={(e)=>setCoach(e.target.value)}>
            <option value="">Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <button style={primaryBtn} onClick={assignTeam}>
            Assign Team
          </button>
        </div>
      )}

      {/* ================= TEAMS ================= */}

      <h3>Teams</h3>

      <div style={grid}>
        {teams.map(t => {
          const nfl = nflTeams.find(n => n.id === t.nfl_team_id);
          return (
            <div key={t.id} style={tile} onClick={()=>setActiveTeam(t)}>
              <img src={teamLogos[nfl?.short_name]} width={50}/>
              <div>{nfl?.full_name}</div>
              <div>{t.division}</div>
            </div>
          );
        })}
      </div>

      {/* ================= TEAM PANEL ================= */}

      {activeTeam && (
        <div style={panel}>
          <h2>Manage Team</h2>

          <h3>Players</h3>

          {players
            .filter(p => p.team_id === activeTeam.id)
            .map(p => (
              <div key={p.id}>{p.first_name} {p.last_name}</div>
            ))}

          <div style={btnRow}>

            <button style={primaryBtn} onClick={autoAssign}>
              Auto Roster
            </button>

            <button style={secondaryBtn} onClick={()=>setShowAdd(true)}>
              Add Player
            </button>

            <button style={secondaryBtn} onClick={()=>setShowMove(true)}>
              Move Players
            </button>

            <button style={dangerBtn} onClick={clearTeam}>
              Clear Team
            </button>

          </div>
        </div>
      )}

      {/* ================= ADD PLAYER ================= */}

      {showAdd && (
        <div style={panel}>
          <h3>Add Player</h3>

          <select
            value={selectedPlayer}
            onChange={(e)=>setSelectedPlayer(e.target.value)}
          >
            <option value="">Select Player</option>

            {players
              .filter(p =>
                p.division === activeTeam.division &&
                !p.team_id
              )
              .map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
          </select>

          <button style={primaryBtn} onClick={addPlayer}>
            Add Player
          </button>
        </div>
      )}

      {/* ================= MOVE ================= */}

      {showMove && (
        <div style={panel}>
          <h3>Move Players</h3>

          <select onChange={(e)=>setTargetTeam(e.target.value)}>
            <option value="">Select Team</option>

            {teams
              .filter(t =>
                t.division === activeTeam.division &&
                t.id !== activeTeam.id
              )
              .map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);
                return (
                  <option key={t.id} value={t.id}>
                    {nfl?.full_name}
                  </option>
                );
              })}
          </select>

          <button style={primaryBtn} onClick={movePlayers}>
            Move All
          </button>
        </div>
      )}

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

const panel = {
  marginTop: 20,
  padding: 20,
  background: "#fff",
  borderRadius: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const btnRow = {
  display: "flex",
  gap: 10,
  marginTop: 10
};

const primaryBtn = {
  flex: 1,
  padding: 12,
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10
};

const secondaryBtn = {
  flex: 1,
  padding: 12,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 10
};

const dangerBtn = {
  flex: 1,
  padding: 12,
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 10
};
