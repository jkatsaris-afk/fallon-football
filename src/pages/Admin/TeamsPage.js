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
import ravens from "../../resources/Baltimore Ravens.png"; // ✅ ADDED

const teamLogos = {
  bills, bengals, broncos, lions, colts,
  chiefs, raiders, rams, jets, eagles,
  steelers, "49ers": niners,
  ravens // ✅ ADDED
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

  const [showAdd, setShowAdd] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);

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

  /* ================= HELPER ================= */

  const getCoachName = (id) => {
    const c = coaches.find(coach => coach.id === id);
    if (!c) return "—";
    return `${c.first_name || ""} ${c.last_name || ""}`.trim();
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

  /* ================= AUTO ================= */

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

  /* ================= REMOVE ================= */

  const removeTeam = async () => {
    await supabase
      .from("players")
      .update({ team_id: null })
      .eq("team_id", activeTeam.id);

    await supabase
      .from("teams")
      .delete()
      .eq("id", activeTeam.id);

    setActiveTeam(null);
    loadData();
  };

  return (
    <div>

      <h1>Teams Manager</h1>

      {/* ================= SELECT ================= */}

      <div style={grid}>
        {nflTeams.map(team => (
          <div key={team.id} style={tile} onClick={()=>setSelectedTeam(team)}>
            <img src={teamLogos[team.short_name]} width={60}/>
            <div>{team.full_name}</div>
          </div>
        ))}
      </div>

      {/* ================= ASSIGNED ================= */}

      <h3 style={{ marginTop: 30 }}>Assigned Teams</h3>

      {["K-1","2nd-3rd","4th-5th","6th+"].map(div => {
        const divTeams = teams.filter(t => t.division === div);
        if (divTeams.length === 0) return null;

        return (
          <div key={div}>
            <div style={{ fontWeight: 600 }}>{div}</div>

            <div style={grid}>
              {divTeams.map(t => {
                const nfl = nflTeams.find(n => n.id === t.nfl_team_id);
                return (
                  <div key={t.id} style={tile} onClick={()=>setActiveTeam(t)}>
                    <img src={teamLogos[nfl?.short_name]} width={50}/>
                    <div>{nfl?.full_name}</div>
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

          {/* ✅ FIXED COACH DISPLAY */}
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

            <button style={secondaryBtn}>
              Add Player
            </button>

            <button style={dangerBtn} onClick={removeTeam}>
              Remove Team
            </button>
          </div>
        </div>
      )}

      {/* ================= CONFIRM ================= */}

      {confirmAuto && (
        <div style={panel}>
          <button style={closeBtn} onClick={()=>setConfirmAuto(false)}>✕</button>

          <p>
            Make sure all teams are created in this division before running auto roster.
          </p>

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
  cursor: "pointer"
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
