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
    await supabase.from("players")
      .update({ team_id: activeTeam.id })
      .eq("id", playerId);

    loadData();
  };

  const removePlayerFromTeam = async (playerId) => {
    await supabase.from("players")
      .update({ team_id: null })
      .eq("id", playerId);

    loadData();
  };

  const movePlayerToTeam = async (playerId, newTeamId) => {
    if (!newTeamId) return;

    await supabase.from("players")
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

  /* ================= TEAM VIEW ================= */

  if (activeTeam) {
    const nfl = nflTeams.find(n => n.id === activeTeam.nfl_team_id);

    return (
      <div>

        <button style={backBtn} onClick={() => setActiveTeam(null)}>
          ← Back to Teams
        </button>

        <div style={teamHero}>
          <img src={teamLogos[nfl?.short_name]} width={90} />
          <div>
            <h1>{nfl?.full_name}</h1>
            <div style={divisionBadge}>{activeTeam.division}</div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={actionGrid}>
          <div style={actionTile} onClick={() => setShowAdd(true)}>
            Add Player
          </div>

          <div style={dangerTile} onClick={removeTeam}>
            Remove Team
          </div>
        </div>

        {/* PLAYERS */}
        <div style={playersTile}>
          <h3>Players</h3>

          {players.filter(p => p.team_id === activeTeam.id).map(p => {

            const divisionTeams = teams.filter(
              t => t.division === activeTeam.division
            );

            return (
              <div key={p.id} style={playerRowModern}>

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

        {/* ================= MODAL ================= */}
        {showAdd && (
          <div style={modalOverlay}>

            <div style={modalBox}>

              <div style={modalHeader}>
                <h3>Add Player</h3>

                <button
                  style={closeBtn}
                  onClick={() => setShowAdd(false)}
                >
                  ✕
                </button>
              </div>

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
        )}

      </div>
    );
  }

  /* ================= MAIN ================= */

  return (
    <div>
      <h1>Teams Manager</h1>

      {["K-1","2nd-3rd","4th-5th","6th+"].map(div => {
        const divTeams = teams.filter(t => t.division === div);
        if (!divTeams.length) return null;

        return (
          <div key={div} style={divisionTile}>
            <div style={divisionHeader}>{div}</div>

            <div style={grid}>
              {divTeams.map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

                return (
                  <div key={t.id} style={tile} onClick={()=>setActiveTeam(t)}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
                    <div style={{ fontSize: 11 }}>
                      {getCoachName(t.coach_id)}
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
  alignItems: "center",
  marginBottom: 10
};

const closeBtn = {
  border: "none",
  background: "#f1f5f9",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer"
};

const addBtn = {
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer"
};

const playerRowModern = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9"
};

const dropdown = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #e2e8f0"
};

const removeBtn = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer"
};

const playerActions = { display: "flex", gap: 8 };

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

const divisionHeader = { fontWeight: "600", marginBottom: 10 };

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 20
};

const actionTile = {
  background: "#fff",
  padding: 15,
  borderRadius: 12,
  textAlign: "center",
  cursor: "pointer"
};

const dangerTile = {
  ...actionTile,
  background: "#fee2e2",
  color: "#991b1b"
};

const playersTile = {
  background: "#fff",
  padding: 15,
  borderRadius: 12
};

const backBtn = {
  marginBottom: 15,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  cursor: "pointer"
};

const teamHero = {
  display: "flex",
  alignItems: "center",
  gap: 20,
  marginBottom: 20
};

const divisionBadge = {
  background: "#e2e8f0",
  padding: "4px 10px",
  borderRadius: 8
};
