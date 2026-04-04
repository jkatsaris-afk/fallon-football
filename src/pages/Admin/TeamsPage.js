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
  const [assistantCoach, setAssistantCoach] = useState(""); // ✅ ADDED

  const [showMove, setShowMove] = useState(false);
  const [targetTeam, setTargetTeam] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");

  const [confirmAuto, setConfirmAuto] = useState(false); // ✅ ADDED

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
      assistant_coach_id: assistantCoach || null, // ✅ ADDED
      season_id: 2026
    }]);

    loadData();
    setSelectedTeam(null);
  };

  /* ================= AUTO ROSTER (UPDATED) ================= */

  const autoAssign = async () => {
    if (!activeTeam) return;

    const divisionTeams = teams.filter(
      t => t.division === activeTeam.division
    );

    if (divisionTeams.length < 2) {
      alert("Need at least 2 teams in this division");
      return;
    }

    const missingCoach = divisionTeams.some(t => !t.coach_id);

    if (missingCoach) {
      alert("All teams must have a coach assigned first");
      return;
    }

    const availablePlayers = players.filter(
      p => p.division === activeTeam.division && !p.team_id
    );

    if (availablePlayers.length === 0) {
      alert("No available players");
      return;
    }

    const perTeam = Math.ceil(
      availablePlayers.length / divisionTeams.length
    );

    let index = 0;

    for (let team of divisionTeams) {
      const chunk = availablePlayers.slice(index, index + perTeam);

      for (let p of chunk) {
        await supabase.from("players")
          .update({ team_id: team.id })
          .eq("id", p.id);
      }

      index += perTeam;
    }

    alert("✅ Teams balanced");
    loadData();
  };

  const clearTeam = async () => {
    await supabase.from("players")
      .update({ team_id: null })
      .eq("team_id", activeTeam.id);

    loadData();
  };

  const movePlayers = async () => {
    await supabase.from("players")
      .update({ team_id: targetTeam })
      .eq("team_id", activeTeam.id);

    setShowMove(false);
    loadData();
  };

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
          <div key={team.id} style={tile} onClick={() => setSelectedTeam(team)}>
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

          <select style={inputStyle} onChange={(e)=>setDivision(e.target.value)}>
            <option value="">Division</option>
            <option>K-1</option>
            <option>2nd-3rd</option>
            <option>4th-5th</option>
            <option>6th+</option>
          </select>

          <select style={inputStyle} onChange={(e)=>setCoach(e.target.value)}>
            <option value="">Head Coach</option>
            {coaches.filter(c=>c.role==="Head Coach").map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>

          {/* ✅ NEW */}
          <select style={inputStyle} onChange={(e)=>setAssistantCoach(e.target.value)}>
            <option value="">Assistant Coach</option>
            {coaches.filter(c=>c.role==="Assistant Coach").map(c => (
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
          <button style={closeBtn} onClick={()=>setActiveTeam(null)}>✕</button>

          <h2>Manage Team</h2>

          <h3>Players</h3>

          {players
            .filter(p => p.team_id === activeTeam.id)
            .map(p => (
              <div key={p.id}>{p.first_name} {p.last_name}</div>
            ))}

          <div style={btnRow}>
            <button style={primaryBtn} onClick={()=>setConfirmAuto(true)}>
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

      {/* ================= CONFIRM AUTO ================= */}

      {confirmAuto && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setConfirmAuto(false)}>✕</button>

          <h3>⚠️ Confirm Auto Roster</h3>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Make sure all teams and coaches are assigned first.
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button style={primaryBtn} onClick={async()=>{
              setConfirmAuto(false);
              await autoAssign();
            }}>
              Confirm
            </button>

            <button style={secondaryBtn} onClick={()=>setConfirmAuto(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* (rest of your add/move panels unchanged) */}

    </div>
  );
}

/* ================= STYLES (UNCHANGED) ================= */
