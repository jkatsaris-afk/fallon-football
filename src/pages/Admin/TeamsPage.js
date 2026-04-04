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
  const [players, setPlayers] = useState([]); // ✅ ADDED

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);

  const [division, setDivision] = useState("");
  const [coach, setCoach] = useState("");
  const [assistantCoach, setAssistantCoach] = useState("");

  const [confirmAuto, setConfirmAuto] = useState(false);
  const [showAdd, setShowAdd] = useState(false); // ✅ ADDED

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: c } = await supabase.from("coaches").select("*");
    const { data: p } = await supabase.from("players").select("*"); // ✅ ADDED

    setNflTeams(nfl || []);
    setTeams(t || []);
    setCoaches(c || []);
    setPlayers(p || []); // ✅ ADDED
  };

  /* ================= HELPERS ================= */

  const getCoachName = (id) => {
    const c = coaches.find(x => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  };

  /* ================= ASSIGN ================= */

  const assignTeam = async () => {
    if (!selectedTeam || !division || !coach) {
      alert("Select division and coach");
      return;
    }

    await supabase.from("teams").insert([{
      nfl_team_id: selectedTeam.id,
      division,
      coach_id: coach,
      assistant_coach_id: assistantCoach || null,
      season_id: 2026
    }]);

    setSelectedTeam(null);
    setDivision("");
    setCoach("");
    setAssistantCoach("");

    loadData();
  };

  /* ================= ADD PLAYER ================= */

  const addPlayerToTeam = async (playerId) => {
    await supabase
      .from("players")
      .update({ team_id: activeTeam.id })
      .eq("id", playerId);

    setShowAdd(false);
    loadData();
  };

  /* ================= REMOVE ================= */

  const removeTeam = async () => {
    await supabase.from("teams")
      .delete()
      .eq("id", activeTeam.id);

    setActiveTeam(null);
    loadData();
  };

  return (
    <div>

      <h1>Teams Manager</h1>

      {/* ================= SELECT ================= */}

      <h3>Select NFL Team</h3>

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

      {/* ================= ASSIGN PANEL ================= */}

      {selectedTeam && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setSelectedTeam(null)}>✕</button>

          <h3>{selectedTeam.full_name}</h3>

          <select style={inputStyle} onChange={(e)=>setDivision(e.target.value)}>
            <option value="">Division</option>
            <option>K-1</option>
            <option>2nd-3rd</option>
            <option>4th-5th</option>
            <option>6th+</option>
          </select>

          <select style={inputStyle} onChange={(e)=>setCoach(e.target.value)}>
            <option value="">Head Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <select style={inputStyle} onChange={(e)=>setAssistantCoach(e.target.value)}>
            <option value="">Assistant Coach</option>
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

      {/* ================= ASSIGNED ================= */}

      <h3 style={{ marginTop: 30 }}>Assigned Teams</h3>

      {["K-1","2nd-3rd","4th-5th","6th+"].map(div => {
        const divTeams = teams.filter(t => t.division === div);
        if (divTeams.length === 0) return null;

        return (
          <div key={div} style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600 }}>{div}</div>

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

                    <div style={{ fontSize: 11, color:"#64748b" }}>
                      {getCoachName(t.assistant_coach_id)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ================= MANAGE ================= */}

      {activeTeam && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setActiveTeam(null)}>✕</button>

          <h2>Manage Team</h2>

          <div>
            <strong>Head Coach:</strong> {getCoachName(activeTeam.coach_id)}
          </div>

          <div>
            <strong>Assistant:</strong> {getCoachName(activeTeam.assistant_coach_id)}
          </div>

          <div style={btnRow}>
            <button style={primaryBtn} onClick={()=>setConfirmAuto(true)}>
              Auto Roster
            </button>

            <button style={secondaryBtn} onClick={()=>setShowAdd(true)}>
              Add Player
            </button>

            <button style={dangerBtn} onClick={removeTeam}>
              Remove Team
            </button>
          </div>
        </div>
      )}

      {/* ================= ADD PLAYER PANEL ================= */}

      {showAdd && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setShowAdd(false)}>✕</button>

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

      {/* ================= CONFIRM ================= */}

      {confirmAuto && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setConfirmAuto(false)}>✕</button>

          <p>
            Make sure all teams are created in this division before running auto roster.
          </p>

          <button style={primaryBtn} onClick={()=>setConfirmAuto(false)}>
            Confirm
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
  gap: 10,
  position: "relative"
};

const playerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const smallBtn = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #e2e8f0"
};

const closeBtn = {
  position: "absolute",
  top: 10,
  right: 10,
  border: "none",
  background: "transparent",
  cursor: "pointer"
};

const inputStyle = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e2e8f0"
};

const btnRow = {
  display: "flex",
  gap: 10
};

const primaryBtn = {
  padding: 10,
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10
};

const secondaryBtn = {
  padding: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 10
};

const dangerBtn = {
  padding: 10,
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 10
};
