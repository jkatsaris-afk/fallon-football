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
  const [assistantCoach, setAssistantCoach] = useState("");

  const [showMove, setShowMove] = useState(false);
  const [targetTeam, setTargetTeam] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");

  const [confirmAuto, setConfirmAuto] = useState(false);

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

    loadData();
    setSelectedTeam(null);
  };

  const autoAssign = async () => {
    if (!activeTeam) return;

    const divisionTeams = teams.filter(
      t => t.division === activeTeam.division
    );

    if (divisionTeams.length < 2) {
      alert("Need at least 2 teams");
      return;
    }

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

  return (
    <div>

      <h1>Teams Manager</h1>

      {/* TEAM SELECT */}
      <div style={grid}>
        {nflTeams.map(team => (
          <div key={team.id} style={tile} onClick={()=>setSelectedTeam(team)}>
            <img src={teamLogos[team.short_name]} width={60}/>
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

      {/* ASSIGN PANEL */}
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

          {/* SAFE coach list */}
          <select style={inputStyle} onChange={(e)=>setCoach(e.target.value)}>
            <option value="">Head Coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          {/* SAFE assistant */}
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

      {/* TEAMS */}
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

      {/* TEAM PANEL */}
      {activeTeam && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setActiveTeam(null)}>✕</button>

          <h2>Manage Team</h2>

          <div style={btnRow}>
            <button style={primaryBtn} onClick={()=>setConfirmAuto(true)}>
              Auto Roster
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM */}
      {confirmAuto && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setConfirmAuto(false)}>✕</button>

          <h3>Confirm Auto Roster</h3>

          <button style={primaryBtn} onClick={()=>{
            setConfirmAuto(false);
            autoAssign();
          }}>
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

const btnRow = {
  display: "flex",
  gap: 10
};

const primaryBtn = {
  flex: 1,
  padding: 12,
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10
};
