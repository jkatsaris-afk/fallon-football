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

  const movePlayerToTeam = async (playerId, newTeamId) => {
    if (!newTeamId) return;

    await supabase
      .from("players")
      .update({ team_id: newTeamId })
      .eq("id", playerId);

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
        </div>

        {/* ================= FIXED MODAL ================= */}
        {showAdd && (
          <div style={modalOverlay}>
            <div style={modalBox}>

              <div style={modalHeader}>
                <h3 style={{ margin: 0 }}>Add Player</h3>

                <button
                  style={closeBtnFixed}
                  onClick={() => setShowAdd(false)}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                {players
                  .filter(p =>
                    p.division === activeTeam.division &&
                    !p.team_id
                  )
                  .map(p => (
                    <div key={p.id} style={playerRowModern}>
                      <div>
                        {p.first_name} {p.last_name}
                      </div>

                      <button
                        style={addBtn}
                        onClick={() => addPlayerToTeam(p.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  return <div />; // unchanged
}

/* ================= ORIGINAL STYLES (UNCHANGED) ================= */
/* ... ALL YOUR EXISTING STYLES STAY EXACTLY AS THEY WERE ... */

/* ================= NEW STYLES (ONLY ADD THESE) ================= */

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999
};

const modalBox = {
  background: "#fff",
  borderRadius: 14,
  padding: 20,
  width: 400,
  maxHeight: "70vh",
  overflowY: "auto"
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const closeBtnFixed = {
  border: "none",
  background: "#f1f5f9",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer"
};

const playerRowModern = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 0"
};

const addBtn = {
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer"
};
