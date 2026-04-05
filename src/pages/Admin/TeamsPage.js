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

  const removePlayerFromTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: null })
      .eq("id", playerId);

    loadData();
  };

  // ✅ FIXED FUNCTION
  const movePlayerToTeam = async (playerId, newTeamId) => {
    if (!newTeamId) return;

    const parsedTeamId = newTeamId.toString();

    const { error } = await supabase
      .from("players")
      .update({ team_id: parsedTeamId })
      .eq("id", playerId);

    if (error) {
      console.error("Move player error:", error);
      return;
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

  /* ================= TEAM MANAGER ================= */

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

        {/* PLAYERS */}
        <div style={playersTile}>
          <h3>Players</h3>

          {players
            .filter(p => p.team_id === activeTeam.id)
            .map(p => {

              const divisionTeams = teams.filter(
                t => t.division === activeTeam.division
              );

              return (
                <div key={p.id} style={playerRow}>

                  <div>
                    {p.first_name} {p.last_name}
                  </div>

                  <div style={playerActions}>

                    <select
                      key={p.team_id || "none"}   {/* ✅ FIX */}
                      style={dropdown}
                      onChange={(e) => movePlayerToTeam(p.id, e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Move</option>

                      {divisionTeams.map(t => {
                        const nfl = nflTeams.find(n => n.id === t.nfl_team_id);
                        return (
                          <option key={t.id} value={t.id}>
                            {nfl?.full_name}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      style={removeBtn}
                      onClick={() => removePlayerFromTeam(p.id)}
                    >
                      Remove
                    </button>

                  </div>

                </div>
              );
            })}

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

  return <div />;
}
