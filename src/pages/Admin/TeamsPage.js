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
  bills,
  bengals,
  broncos,
  lions,
  colts,
  chiefs,
  raiders,
  rams,
  jets,
  eagles,
  steelers,
  "49ers": niners
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

  useEffect(() => {
    loadData();
  }, []);

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

  /* ================= ASSIGN TEAM ================= */

  const assignTeam = async () => {
    if (!selectedTeam || !division || !coach) {
      alert("Select division and coach");
      return;
    }

    const { error } = await supabase.from("teams").insert([
      {
        nfl_team_id: selectedTeam.id,
        division,
        coach_id: coach,
        season_id: 2026
      }
    ]);

    if (error) {
      alert("❌ Team already used in this division");
      return;
    }

    setSelectedTeam(null);
    setDivision("");
    setCoach("");

    loadData();
  };

  /* ================= AUTO ROSTER ================= */

  const autoAssign = async () => {
    if (!activeTeam) return;

    const availablePlayers = players.filter(
      (p) =>
        p.division === activeTeam.division &&
        !p.team_id
    );

    const divisionTeams = teams.filter(
      (t) => t.division === activeTeam.division
    );

    if (divisionTeams.length === 0) return;

    const playersPerTeam = Math.ceil(
      availablePlayers.length / divisionTeams.length
    );

    const assignPlayers = availablePlayers.slice(0, playersPerTeam);

    for (let player of assignPlayers) {
      await supabase
        .from("players")
        .update({ team_id: activeTeam.id })
        .eq("id", player.id);
    }

    alert("Roster created");
    loadData();
  };

  /* ================= CLEAR TEAM ================= */

  const clearTeam = async () => {
    await supabase
      .from("players")
      .update({ team_id: null })
      .eq("team_id", activeTeam.id);

    loadData();
  };

  return (
    <div>
      <h1>Teams Manager</h1>

      {/* ================= NFL TEAM SELECT ================= */}

      <div style={grid}>
        {nflTeams.map((team) => (
          <div
            key={team.id}
            style={{
              ...tile,
              border:
                selectedTeam?.id === team.id
                  ? "2px solid #2f6ea6"
                  : "2px solid transparent"
            }}
            onClick={() => setSelectedTeam(team)}
          >
            <img src={teamLogos[team.short_name]} width={60} />
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

      {/* ================= ASSIGN ================= */}

      {selectedTeam && (
        <div style={panel}>
          <h3>{selectedTeam.full_name}</h3>

          <select onChange={(e) => setDivision(e.target.value)}>
            <option value="">Division</option>
            <option>K-1</option>
            <option>2nd-3rd</option>
            <option>4th-5th</option>
            <option>6th+</option>
          </select>

          <select onChange={(e) => setCoach(e.target.value)}>
            <option value="">Coach</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <button onClick={assignTeam}>Assign</button>
        </div>
      )}

      {/* ================= TEAMS ================= */}

      <h3 style={{ marginTop: 30 }}>Teams</h3>

      <div style={grid}>
        {teams.map((t) => {
          const nfl = nflTeams.find((n) => n.id === t.nfl_team_id);
          const coachData = coaches.find((c) => c.id === t.coach_id);

          return (
            <div
              key={t.id}
              style={tile}
              onClick={() => setActiveTeam(t)}
            >
              <img src={teamLogos[nfl?.short_name]} width={50} />
              <div>{nfl?.full_name}</div>
              <div>{t.division}</div>
              <div style={{ fontSize: 12 }}>
                {coachData
                  ? `${coachData.first_name} ${coachData.last_name}`
                  : "No Coach"}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= TEAM PANEL ================= */}

      {activeTeam && (
        <div style={panel}>
          <h2>Manage Team</h2>

          <div>Division: {activeTeam.division}</div>

          <h3>Players</h3>

          {players
            .filter((p) => p.team_id === activeTeam.id)
            .map((p) => (
              <div key={p.id}>
                {p.first_name} {p.last_name}
              </div>
            ))}

          <div style={{ marginTop: 10 }}>
            <button onClick={autoAssign}>Auto Roster</button>
            <button onClick={clearTeam}>Clear Team</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 15,
  marginTop: 20
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
