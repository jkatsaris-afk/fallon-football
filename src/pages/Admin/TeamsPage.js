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

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);

  const [confirmAuto, setConfirmAuto] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

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

  const getCoachName = (id) => {
    const c = coaches.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  const addPlayerToTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: activeTeam.id })
      .eq("id", playerId);

    loadData();
  };

  const autoAssign = async () => {
    const divisionTeams = teams.filter(
      t => t.division === activeTeam.division
    );

    const available = players.filter(
      p => p.division === activeTeam.division && !p.team_id
    );

    const perTeam = Math.ceil(available.length / divisionTeams.length);

    let index = 0;

    for (let team of divisionTeams) {
      const chunk = available.slice(index, index + perTeam);

      for (let p of chunk) {
        await supabase.from("players")
          .update({ team_id: team.id })
          .eq("id", p.id);
      }

      index += perTeam;
    }

    loadData();
  };

  const removeTeam = async () => {
    await supabase.from("teams")
      .delete()
      .eq("id", activeTeam.id);

    setActiveTeam(null);
    loadData();
  };

  /* ================= OVERLAY VIEW ================= */

  if (activeTeam) {
    const nfl = nflTeams.find(n => n.id === activeTeam.nfl_team_id);

    return (
      <div>

        <div style={headerBar}>
          <button style={backBtn} onClick={() => setActiveTeam(null)}>
            ← Back to Teams
          </button>
        </div>

        <div style={teamHero}>
          <img src={teamLogos[nfl?.short_name]} width={90} />
          <div>
            <h1 style={{ margin: 0 }}>{nfl?.full_name}</h1>
            <div style={divisionBadge}>{activeTeam.division}</div>
          </div>
        </div>

        <div style={coachGrid}>
          <div style={coachCard}>
            <div style={coachLabel}>Head Coach</div>
            <div style={coachName}>
              {getCoachName(activeTeam.coach_id)}
            </div>
          </div>

          <div style={coachCard}>
            <div style={coachLabel}>Assistant Coach</div>
            <div style={coachName}>
              {getCoachName(activeTeam.assistant_coach_id)}
            </div>
          </div>
        </div>

        {/* ACTION TILES */}
        <div style={actionGrid}>
          <div style={actionTile} onClick={()=>setConfirmAuto(true)}>
            Auto Roster
          </div>

          <div style={actionTile} onClick={()=>setShowAdd(true)}>
            Add Player
          </div>

          <div style={dangerTile} onClick={removeTeam}>
            Remove Team
          </div>
        </div>

        {/* PLAYERS TILE */}
        <div style={playersTile}>
          <h3>Players</h3>

          {players
            .filter(p => p.team_id === activeTeam.id)
            .map(p => (
              <div key={p.id} style={playerRow}>
                {p.first_name} {p.last_name}
              </div>
            ))}

          {players.filter(p => p.team_id === activeTeam.id).length === 0 && (
            <div style={{ color:"#64748b" }}>
              No players assigned
            </div>
          )}
        </div>

        {/* ADD PLAYER */}
        {showAdd && (
          <div style={{ ...section, position: "relative" }}>
            <button style={closeBtn} onClick={() => setShowAdd(false)}>✕</button>

            <h3>Add Player</h3>

            {players
              .filter(p =>
                p.division === activeTeam.division &&
                !p.team_id
              )
              .map(p => (
                <div key={p.id} style={playerRow}>
                  {p.first_name} {p.last_name}

                  <button
                    style={smallBtn}
                    onClick={() => addPlayerToTeam(p.id)}
                  >
                    Add
                  </button>
                </div>
              ))}
          </div>
        )}

      </div>
    );
  }

  /* ================= MAIN VIEW ================= */

  return (
    <div>

      <h1>Teams Manager</h1>

      <h3>Select NFL Team</h3>

      <div style={grid}>
        {nflTeams.map(team => (
          <div key={team.id} style={tile}>
            <img src={teamLogos[team.short_name]} width={60}/>
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 30 }}>Assigned Teams</h3>

      <div style={grid}>
        {teams.map(t => {
          const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

          return (
            <div key={t.id} style={tile} onClick={()=>setActiveTeam(t)}>
              <img src={teamLogos[nfl?.short_name]} width={50}/>
              <div>{nfl?.full_name}</div>

              <div style={{ fontSize: 11 }}>
                {getCoachName(t.coach_id)}
              </div>

              <div style={{ fontSize: 11, color:"#64748b" }}>
                {getCoachName(t.assistant_coach_id)}
              </div>
            </div>
          );
        })}
      </div>

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

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 12,
  marginBottom: 25
};

const actionTile = {
  background: "#fff",
  borderRadius: 12,
  padding: 15,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  fontWeight: "600"
};

const dangerTile = {
  ...actionTile,
  background: "#fee2e2",
  color: "#991b1b"
};

const playersTile = {
  background: "#fff",
  borderRadius: 12,
  padding: 15,
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
};
