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

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);

  const [division, setDivision] = useState("");
  const [coach, setCoach] = useState("");
  const [assistantCoach, setAssistantCoach] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: c } = await supabase.from("coaches").select("*");

    setNflTeams(nfl || []);
    setTeams(t || []);
    setCoaches(c || []);
  };

  /* ================= ASSIGN TEAM ================= */

  const assignTeam = async () => {
    if (!selectedTeam || !division || !coach) {
      alert("Select division and coach");
      return;
    }

    const { error } = await supabase.from("teams").insert([{
      nfl_team_id: selectedTeam.id,
      division,
      coach_id: coach,
      assistant_coach_id: assistantCoach || null,
      season_id: 2026
    }]);

    if (error) {
      alert("❌ Team already used in this division");
      return;
    }

    setSelectedTeam(null);
    setDivision("");
    setCoach("");
    setAssistantCoach("");

    await loadData();
  };

  return (
    <div>

      <h1>Teams Manager</h1>

      {/* ================= SELECT NFL TEAM ================= */}

      <h3>Select NFL Team</h3>

      <div style={grid}>
        {nflTeams
          .filter(nfl =>
            !teams.some(t =>
              t.nfl_team_id === nfl.id &&
              t.division === division
            )
          )
          .map(team => (
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
          <button style={closeBtn} onClick={() => setSelectedTeam(null)}>✕</button>

          <h3>{selectedTeam.full_name}</h3>

          <select
            style={inputStyle}
            value={division}
            onChange={(e)=>setDivision(e.target.value)}
          >
            <option value="">Division</option>
            <option>K-1</option>
            <option>2nd-3rd</option>
            <option>4th-5th</option>
            <option>6th+</option>
          </select>

          <select
            style={inputStyle}
            value={coach}
            onChange={(e)=>setCoach(e.target.value)}
          >
            <option value="">Head Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <select
            style={inputStyle}
            value={assistantCoach}
            onChange={(e)=>setAssistantCoach(e.target.value)}
          >
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

      {/* ================= ASSIGNED TEAMS ================= */}

      <h3 style={{ marginTop: 30 }}>Assigned Teams</h3>

      <div style={grid}>
        {teams.map(t => {
          const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

          return (
            <div
              key={t.id}
              style={tile}
              onClick={() => setActiveTeam(t)}
            >
              <img src={teamLogos[nfl?.short_name]} width={50}/>
              <div>{nfl?.full_name}</div>

              <div style={{ fontSize: 12, color: "#64748b" }}>
                {t.division}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= TEAM MANAGER ================= */}

      {activeTeam && (
        <div style={panel}>
          <button style={closeBtn} onClick={() => setActiveTeam(null)}>✕</button>

          <h2>Manage Team</h2>

          <div style={{ fontSize: 14, color: "#64748b" }}>
            Division: {activeTeam.division}
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
  marginTop: 15
};

const tile = {
  background: "#fff",
  borderRadius: 12,
  padding: 10,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
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

const closeBtn = {
  position: "absolute",
  top: 10,
  right: 10,
  border: "none",
  background: "transparent",
  fontSize: 18,
  cursor: "pointer"
};

const inputStyle = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e2e8f0"
};

const primaryBtn = {
  padding: 12,
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10
};
