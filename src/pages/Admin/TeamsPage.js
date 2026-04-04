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

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [division, setDivision] = useState("");
  const [coach, setCoach] = useState("");

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

  const assignTeam = async () => {
    // ✅ UPDATED VALIDATION
    if (!selectedTeam || !division || !coach) {
      alert("Please select division and coach");
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

  return (
    <div>
      <h1>Teams Manager</h1>
      <p style={{ color: "#64748b" }}>
        Assign NFL teams to divisions and coaches
      </p>

      {/* ================= TEAM TILE GRID ================= */}

      <div style={gridStyle}>
        {nflTeams.map((team) => (
          <div
            key={team.id}
            style={{
              ...tileStyle,
              border:
                selectedTeam?.id === team.id
                  ? "2px solid #2f6ea6"
                  : "2px solid transparent"
            }}
            onClick={() => setSelectedTeam(team)}
          >
            <img
              src={teamLogos[team.short_name]}
              alt={team.full_name}
              style={{ width: 60, height: 60 }}
            />
            <div style={{ marginTop: 8, fontSize: 12 }}>
              {team.full_name}
            </div>
          </div>
        ))}
      </div>

      {/* ================= ASSIGN PANEL ================= */}

      {selectedTeam && (
        <div style={panelStyle}>
          <h3>{selectedTeam.full_name}</h3>

          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            style={inputStyle}
          >
            <option value="">Select Division</option>
            <option>K-1</option>
            <option>2nd-3rd</option>
            <option>4th-5th</option>
            <option>6th+</option>
          </select>

          <select
            value={coach}
            onChange={(e) => setCoach(e.target.value)}
            style={inputStyle}
          >
            <option value="">Assign Coach</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          <button onClick={assignTeam} style={btnStyle}>
            Assign Team
          </button>
        </div>
      )}

      {/* ================= CREATED TEAMS ================= */}

      <div style={{ marginTop: 30 }}>
        <h3>Assigned Teams</h3>

        <div style={gridStyle}>
          {teams.map((t) => {
            const nfl = nflTeams.find((n) => n.id === t.nfl_team_id);

            // ✅ ADDED COACH LOOKUP
            const coachData = coaches.find((c) => c.id === t.coach_id);

            return (
              <div key={t.id} style={tileStyle}>
                <img
                  src={teamLogos[nfl?.short_name]}
                  style={{ width: 50 }}
                />
                <div>{nfl?.full_name}</div>

                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {t.division}
                </div>

                {/* ✅ SHOW COACH */}
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {coachData
                    ? `${coachData.first_name} ${coachData.last_name}`
                    : "No Coach"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 15,
  marginTop: 20
};

const tileStyle = {
  background: "#fff",
  borderRadius: 16,
  padding: 12,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const panelStyle = {
  marginTop: 20,
  padding: 20,
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const inputStyle = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e2e8f0"
};

const btnStyle = {
  padding: 12,
  borderRadius: 12,
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};
