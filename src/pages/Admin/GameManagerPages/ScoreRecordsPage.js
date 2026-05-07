import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

/* TEAM LOGOS */
import Logo49ers from "../../../resources/San Francisco 49ers.png";
import LogoBengals from "../../../resources/Cincinnati Bengals.png";
import LogoBills from "../../../resources/Buffalo Bills.png";
import LogoBroncos from "../../../resources/Denver Broncos.png";
import LogoChiefs from "../../../resources/Kansas City Chiefs.png";
import LogoColts from "../../../resources/Indianapolis Colts.png";
import LogoEagles from "../../../resources/Philadelphia Eagles.png";
import LogoJets from "../../../resources/New York Jets.png";
import LogoLions from "../../../resources/Detroit Lions.png";
import LogoRaiders from "../../../resources/Las Vegas Raiders.png";
import LogoRams from "../../../resources/Los Angeles Rams.png";
import LogoSteelers from "../../../resources/Pittsburgh Steelers.png";
import LogoRavens from "../../../resources/Baltimore Ravens.png";

const TEAM_LOGOS = {
  "49ers": Logo49ers,
  Bengals: LogoBengals,
  Bills: LogoBills,
  Broncos: LogoBroncos,
  Chiefs: LogoChiefs,
  Colts: LogoColts,
  Eagles: LogoEagles,
  Jets: LogoJets,
  Lions: LogoLions,
  Raiders: LogoRaiders,
  Rams: LogoRams,
  Steelers: LogoSteelers,
  Ravens: LogoRavens,
};

/* 🔥 FIXED DIVISION ORDER */
const DIVISION_ORDER = [
  "K-1st",
  "2nd-3rd",
  "4th-5th",
  "6th-8th"
];

/* 🔥 NORMALIZE DIVISION (FIX) */
const normalizeDivision = (d) => {
  if (!d) return "Unknown";

  if (d.includes("K")) return "K-1st";
  if (d.includes("2") && d.includes("3")) return "2nd-3rd";
  if (d.includes("4") && d.includes("5")) return "4th-5th";
  if (d.includes("6") || d.includes("7") || d.includes("8")) return "6th-8th";

  return d;
};

export default function TeamStatsPage() {
  const [games, setGames] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({});
  const [scheduleDetails, setScheduleDetails] = useState({});
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [editingScoreId, setEditingScoreId] = useState(null);
  const [editScores, setEditScores] = useState({ home: "", away: "" });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: scores } = await supabase
      .from("game_scores")
      .select("*");

    const { data: schedule } = await supabase
      .from("schedule_master_auto")
      .select("id, division, week, time, event_time, field");

    const map = {};
    const details = {};
    (schedule || []).forEach(s => {
      map[s.id] = s.division;
      details[s.id] = s;
    });

    setScheduleMap(map);
    setScheduleDetails(details);
    setGames(scores || []);
  };

  const startEdit = (game) => {
    setEditingScoreId(game.id);
    setEditScores({
      home: game.home_score ?? "",
      away: game.away_score ?? "",
    });
    setStatus(null);
  };

  const cancelEdit = () => {
    setEditingScoreId(null);
    setEditScores({ home: "", away: "" });
  };

  const saveScoreEdit = async (game) => {
    const home = Number(editScores.home);
    const away = Number(editScores.away);

    if (Number.isNaN(home) || Number.isNaN(away)) {
      setStatus({ type: "error", message: "Enter valid scores before saving." });
      return;
    }

    const { error } = await supabase
      .from("game_scores")
      .update({
        home_score: home,
        away_score: away,
        home_team: cleanTeamName(game.home_team),
        away_team: cleanTeamName(game.away_team),
      })
      .eq("id", game.id);

    if (error) {
      console.error("Score update failed:", error);
      setStatus({ type: "error", message: "Could not update score." });
      return;
    }

    setStatus({ type: "success", message: "Score updated." });
    cancelEdit();
    load();
  };

  /* 🔥 ORDERED DIVISIONS */
  const divisions = useMemo(() => {
    return ["all", ...DIVISION_ORDER];
  }, []);

  /* 🔥 TEAM STATS (FIXED DIVISION) */
  const teamStats = useMemo(() => {
    const map = {};

    games.forEach(g => {
      const rawDivision = scheduleMap[g.schedule_id];
      const division = normalizeDivision(rawDivision);

      const teams = [
        { name: g.home_team, scored: g.home_score, allowed: g.away_score },
        { name: g.away_team, scored: g.away_score, allowed: g.home_score }
      ];

      teams.forEach(t => {
        const key = `${t.name}_${division}`;

        if (!map[key]) {
          map[key] = {
            team: t.name,
            division,
            wins: 0,
            losses: 0,
            pf: 0,
            pa: 0
          };
        }

        map[key].pf += t.scored;
        map[key].pa += t.allowed;

        if (t.scored > t.allowed) map[key].wins += 1;
        else if (t.scored < t.allowed) map[key].losses += 1;
      });
    });

    return Object.values(map);
  }, [games, scheduleMap]);

  /* 🔥 FILTER (FIXED) */
  const filteredTeams = useMemo(() => {
    if (selectedDivision === "all") return teamStats;

    return teamStats.filter(
      t => normalizeDivision(t.division) === selectedDivision
    );
  }, [teamStats, selectedDivision]);

  /* 🔥 SORT FOR STANDINGS */
  const rankedTeams = useMemo(() => {
    return [...filteredTeams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.pf - b.pa) - (a.pf - a.pa);
    });
  }, [filteredTeams]);

  return (
    <div style={wrap}>

      <h2 style={title}>Team Stats</h2>

      {/* DIVISION FILTER */}
      <div style={filterGrid}>
        {divisions.map(d => (
          <div
            key={d}
            style={{
              ...filterTile,
              ...(selectedDivision === d ? activeTile : {})
            }}
            onClick={() => setSelectedDivision(d)}
          >
            {d === "all" ? "All Divisions" : d}
          </div>
        ))}
      </div>

      {/* TEAM GRID */}
      <div style={grid}>
        {rankedTeams.map(team => {
          const logo = TEAM_LOGOS[team.team];

          return (
            <div key={`${team.team}_${team.division}`} style={card}>

              {logo && <img src={logo} style={logoStyle} />}

              <div style={teamName}>{team.team}</div>

              <div style={record}>
                {team.wins} - {team.losses}
              </div>

              <div style={statsRow}>
                <span>PF: {team.pf}</span>
                <span>PA: {team.pa}</span>
              </div>

              <div style={divisionBadge}>
                {team.division}
              </div>

            </div>
          );
        })}
      </div>

      <div style={resultsPanel}>
        <div style={sectionTitle}>Game Results</div>

        {status && (
          <div style={{
            ...statusBox,
            ...(status.type === "error" ? errorBox : successBox),
          }}>
            {status.message}
          </div>
        )}

        <div style={resultsList}>
          {games.map((game) => {
            const schedule = scheduleDetails[game.schedule_id] || {};
            const isEditing = editingScoreId === game.id;
            const division = normalizeDivision(schedule.division);

            return (
              <div key={game.id} style={resultRow}>
                <div style={resultMeta}>
                  <div style={resultTitle}>
                    {cleanTeamName(game.home_team)} vs {cleanTeamName(game.away_team)}
                  </div>
                  <div style={resultSub}>
                    {division} • Week {schedule.week || "—"} • {schedule.time || schedule.event_time || "Time"} • {schedule.field || "Field"}
                  </div>
                </div>

                {isEditing ? (
                  <div style={editRow}>
                    <input
                      type="number"
                      value={editScores.home}
                      onChange={(e) => setEditScores((current) => ({ ...current, home: e.target.value }))}
                      style={scoreInput}
                    />
                    <span style={scoreDash}>-</span>
                    <input
                      type="number"
                      value={editScores.away}
                      onChange={(e) => setEditScores((current) => ({ ...current, away: e.target.value }))}
                      style={scoreInput}
                    />
                    <button style={saveBtn} onClick={() => saveScoreEdit(game)}>Save</button>
                    <button style={cancelBtn} onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <div style={scoreActions}>
                    <div style={scorePill}>{game.home_score} - {game.away_score}</div>
                    <button style={editBtn} onClick={() => startEdit(game)}>Edit</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

/* STYLES */

const wrap = { display: "flex", flexDirection: "column", gap: 20 };

const title = { fontSize: 24, fontWeight: 700 };

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))",
  gap: 10
};

const filterTile = {
  background: "#fff",
  padding: 12,
  borderRadius: 14,
  textAlign: "center",
  cursor: "pointer",
  fontWeight: 600
};

const activeTile = { outline: "2px solid #2563eb" };

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
  gap: 16
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  textAlign: "center"
};

const logoStyle = { width: 50, marginBottom: 8 };

const teamName = { fontWeight: 700 };

const record = { fontSize: 18, fontWeight: 700 };

const statsRow = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
  fontSize: 12,
  color: "#64748b"
};

const divisionBadge = {
  marginTop: 8,
  background: "#e0f2fe",
  color: "#0369a1",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12
};

const resultsPanel = {
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  padding: 18
};

const sectionTitle = {
  color: "#0f172a",
  fontSize: 20,
  fontWeight: 800,
  marginBottom: 12
};

const resultsList = {
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const resultRow = {
  alignItems: "center",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  padding: 12,
  flexWrap: "wrap"
};

const resultMeta = {
  minWidth: 220
};

const resultTitle = {
  color: "#0f172a",
  fontWeight: 800
};

const resultSub = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 3
};

const scoreActions = {
  alignItems: "center",
  display: "flex",
  gap: 8
};

const scorePill = {
  background: "#e0f2fe",
  borderRadius: 999,
  color: "#0369a1",
  fontWeight: 900,
  padding: "7px 12px"
};

const editBtn = {
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 800,
  padding: "8px 10px"
};

const editRow = {
  alignItems: "center",
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const scoreInput = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: 8,
  textAlign: "center",
  width: 70
};

const scoreDash = {
  color: "#64748b",
  fontWeight: 900
};

const saveBtn = {
  background: "#16a34a",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  padding: "8px 10px"
};

const cancelBtn = {
  background: "#e5e7eb",
  border: "none",
  borderRadius: 10,
  color: "#111827",
  cursor: "pointer",
  fontWeight: 800,
  padding: "8px 10px"
};

const statusBox = {
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 800,
  marginBottom: 12,
  padding: 10
};

const successBox = {
  background: "#dcfce7",
  color: "#166534"
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b"
};
