import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import { applyUuidSeasonFilter, getActiveSeason } from "../../../utils/season";

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

export default function ScoreManagementPage() {
  const [games, setGames] = useState([]);
  const [finalGames, setFinalGames] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [modalGame, setModalGame] = useState(null);
  const [modalScore, setModalScore] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadGames();
    loadFinalGames();
  }, []);

  const loadGames = async () => {
    const active = await getActiveSeason();
    const { data } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*")
      .or("event_type.ilike.%game%,event_type.ilike.%champ%"), active);

    setGames(data || []);
  };

  const loadFinalGames = async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("*");

    setFinalGames(data || []);
  };

  const openModal = (game) => {
    const final = isFinal(game);
    setModalGame(game);
    setModalScore(final || null);
    setHomeScore(final?.home_score ?? "");
    setAwayScore(final?.away_score ?? "");
    setStatus(null);
  };

  const saveScore = async () => {
    const home = Number(homeScore);
    const away = Number(awayScore);

    if (!Number.isFinite(home) || !Number.isFinite(away)) {
      setStatus({ type: "error", message: "Enter valid scores before saving." });
      return;
    }

    const scorePayload = {
      schedule_id: modalGame.id,
      home_team: modalGame.team,
      away_team: modalGame.opponent,
      home_score: home,
      away_score: away,
    };

    const { error } = modalScore?.id
      ? await supabase.from("game_scores").update(scorePayload).eq("id", modalScore.id)
      : await supabase.from("game_scores").insert(scorePayload);

    if (error) {
      console.error("SAVE ERROR:", error);
      setStatus({ type: "error", message: `Could not save score: ${error.message}` });
      return;
    }

    setModalGame(null);
    setModalScore(null);
    setStatus({ type: "success", message: modalScore?.id ? "Score updated." : "Score saved." });
    await loadFinalGames();
  };

  const isFinal = (game) => {
    return finalGames.find(g => g.schedule_id === game.id);
  };

  const weeks = useMemo(() => {
    const unique = [...new Set(games.map(g => g.week).filter(Boolean))];
    return ["all", ...unique.sort((a,b)=>Number(a)-Number(b))];
  }, [games]);

  const parseDate = (date) => {
    if (!date) return null;
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const getWeekDateRange = (weekValue) => {
    const dates = games
      .filter((game) => {
        if (weekValue === "all") return false;
        return String(game.week) === String(weekValue) && game.event_date;
      })
      .map((game) => parseDate(game.event_date))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!dates.length) return "";
    const first = dates[0];
    const last = dates[dates.length - 1];
    return first.toDateString() === last.toDateString()
      ? formatDate(first)
      : `${formatDate(first)} - ${formatDate(last)}`;
  };

  const weekFilteredGames = useMemo(() => {
    if (selectedWeek === "all") return games;

    return games.filter(g => String(g.week) === String(selectedWeek));
  }, [games, selectedWeek]);

  const teamTiles = useMemo(() => {
    const teams = new Map();
    weekFilteredGames.forEach((game) => {
      const division = getGameDivision(game);
      [game.team, game.opponent].forEach((name) => {
        const team = cleanTeamName(name);
        if (!team) return;
        const key = `${team}__${division}`;
        if (!teams.has(key)) teams.set(key, { key, team, division });
      });
    });

    return [
      { key: "all", team: "all", division: "" },
      ...Array.from(teams.values()).sort((a, b) => (
        a.division.localeCompare(b.division) || a.team.localeCompare(b.team)
      )),
    ];
  }, [weekFilteredGames]);

  const filteredGames = useMemo(() => {
    if (!selectedTeam || selectedTeam.key === "all") return weekFilteredGames;

    return weekFilteredGames.filter((game) => (
      getGameDivision(game) === selectedTeam.division &&
      (
        cleanTeamName(game.team) === selectedTeam.team ||
        cleanTeamName(game.opponent) === selectedTeam.team
      )
    ));
  }, [weekFilteredGames, selectedTeam]);

  return (
    <div style={wrap}>
      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      {/* WEEK FILTER */}
      <div style={weekTileGrid}>
        {weeks.map(w => (
          <WeekTile
            key={w}
            label={
              w === "all"
                ? "All Weeks"
                : `Week ${w}`
            }
            date={getWeekDateRange(w)}
            active={selectedWeek === w}
            onClick={() => {
              setSelectedWeek(w);
              setSelectedTeam(null);
            }}
          />
        ))}
      </div>

      <div style={teamTileGrid}>
        {teamTiles.map((team) => (
          <TeamTile
            key={team.key}
            team={team}
            active={(selectedTeam?.key || "all") === team.key}
            onClick={() => setSelectedTeam(team)}
          />
        ))}
      </div>

      {/* GAME GRID */}
      <div style={grid}>
        {filteredGames.map((g) => {
          const homeLogo = TEAM_LOGOS[g.team];
          const awayLogo = TEAM_LOGOS[g.opponent];
          const final = isFinal(g);

          /* 🔥 FIXED DIVISION */
          const division =
            g.division ||
            g.divisions?.name ||
            g.division_name ||
            "No Division";

          return (
            <div key={g.id} style={card}>

              <div style={logoRow}>
                {homeLogo && <img src={homeLogo} style={logo} />}
                <div style={vs}>VS</div>
                {awayLogo && <img src={awayLogo} style={logo} />}
              </div>

              <div style={gameTitle}>
                {g.team} vs {g.opponent}
              </div>

              <div style={gameMeta}>
                Week {g.week} • {g.time || g.event_time} • {g.field}
              </div>

              {/* 🔥 DIVISION BADGE */}
              <div style={divisionBadge}>
                {division}
              </div>

              {!final && (
                <button
                  style={{
                    marginTop: 14,
                    padding: "10px 18px",
                    borderRadius: 999,
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "block",
                    marginLeft: "auto",
                    marginRight: "auto",
                    width: "fit-content",
                    minWidth: 150
                  }}
                  onMouseEnter={(e)=>e.target.style.background="#15803d"}
                  onMouseLeave={(e)=>e.target.style.background="#16a34a"}
                  onClick={() => openModal(g)}
                >
                  Enter Final
                </button>
              )}

              {final && (
                <div style={finalBlock}>
                  <div style={finalBadge}>
                    Final: {final.home_score} - {final.away_score}
                  </div>
                  <button
                    style={editScoreBtn}
                    onClick={() => openModal(g)}
                  >
                    Edit Score
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {modalGame && (
        <div style={overlay}>
          <div style={modal}>

            <h2>{modalGame.team} vs {modalGame.opponent}</h2>
            <div style={modalSub}>
              {modalScore ? "Edit final score" : "Enter final score"}
            </div>

            <div style={scoreRow}>
              <label style={scoreLabel}>
                <span>{modalGame.team || "Home"}</span>
              <input
                type="number"
                value={homeScore}
                onChange={(e)=>setHomeScore(e.target.value)}
                style={scoreInput}
              />
              </label>
              <span>-</span>
              <label style={scoreLabel}>
                <span>{modalGame.opponent || "Away"}</span>
              <input
                type="number"
                value={awayScore}
                onChange={(e)=>setAwayScore(e.target.value)}
                style={scoreInput}
              />
              </label>
            </div>

            <div style={modalBtns}>
              <button style={saveBtn} onClick={saveScore}>
                {modalScore ? "Update Score" : "Save Score"}
              </button>

              <button style={cancelBtn} onClick={() => {
                setModalGame(null);
                setModalScore(null);
              }}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

/* COMPONENTS */
function WeekTile({ label, date, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ ...weekTile, ...(active ? activeWeekTile : {}) }}
    >
      <div>{label}</div>
      {date && <div style={weekDate}>{date}</div>}
    </button>
  );
}

function TeamTile({ team, active, onClick }) {
  const logo = TEAM_LOGOS[team.team];
  const allTeams = team.key === "all";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...teamTile, ...(active ? activeTeamTile : {}) }}
    >
      {allTeams ? (
        <div style={allTeamsIcon}>All</div>
      ) : (
        logo && <img src={logo} alt="" style={teamTileLogo} />
      )}
      <span>{allTeams ? "All Teams" : team.team}</span>
      {!allTeams && <span style={teamTileDivision}>{team.division}</span>}
    </button>
  );
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function getGameDivision(game) {
  return game?.division || game?.divisions?.name || game?.division_name || "No Division";
}

/* STYLES */
const wrap = { padding:20, display:"flex", flexDirection:"column", gap:20 };

const weekTileGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",
  gap:10
};

const weekTile = {
  background:"#fff",
  borderRadius:14,
  padding:12,
  border:"none",
  fontWeight:700,
  cursor:"pointer"
};

const activeWeekTile = { outline:"2px solid #2563eb" };
const weekDate = { color:"#64748b", fontSize:11, fontWeight:600, marginTop:4 };
const teamTileGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(92px,1fr))", gap:10 };
const teamTile = { alignItems:"center", background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, color:"#334155", cursor:"pointer", display:"flex", flexDirection:"column", fontSize:12, fontWeight:800, gap:6, minHeight:84, padding:10 };
const activeTeamTile = { background:"#ecfdf3", borderColor:"#16a34a", color:"#0f7a3b", boxShadow:"inset 0 0 0 1px rgba(22,163,74,0.18)" };
const teamTileLogo = { height:34, objectFit:"contain", width:34 };
const teamTileDivision = { color:"#64748b", fontSize:10, fontWeight:800, lineHeight:1 };
const allTeamsIcon = { alignItems:"center", background:"#0f172a", borderRadius:999, color:"#fff", display:"flex", fontSize:12, fontWeight:900, height:34, justifyContent:"center", width:34 };

const grid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",
  gap:16
};

const card = {
  background:"#fff",
  borderRadius:18,
  padding:18,
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)"
};

const logoRow = { display:"flex", justifyContent:"center", gap:10 };
const logo = { width:40 };
const vs = { fontWeight:700 };

const gameTitle = { textAlign:"center", fontWeight:700 };
const gameMeta = { textAlign:"center", fontSize:12, color:"#64748b" };

const divisionBadge = {
  marginTop: 10,
  background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
  color: "#1e40af",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  textAlign: "center",
  fontWeight: 700,
  width: "fit-content",
  marginLeft: "auto",
  marginRight: "auto",
  boxShadow: "0 2px 6px rgba(0,0,0,0.08)"
};

const finalBadge = {
  marginTop:10,
  padding:"6px 10px",
  borderRadius:8,
  background:"#e5e7eb",
  textAlign:"center"
};
const finalBlock = { alignItems:"center", display:"flex", flexDirection:"column", gap:10, marginTop:10 };
const editScoreBtn = { background:"#0f172a", border:"none", borderRadius:999, color:"#fff", cursor:"pointer", fontWeight:800, padding:"9px 16px" };
const statusBox = { borderRadius:12, fontWeight:800, padding:"12px 14px" };
const successBox = { background:"#dcfce7", color:"#166534" };
const errorBox = { background:"#fee2e2", color:"#991b1b" };

const overlay = {
  position:"fixed",
  top:0,
  left:0,
  right:0,
  bottom:0,
  background:"rgba(0,0,0,0.5)",
  display:"flex",
  alignItems:"center",
  justifyContent:"center"
};

const modal = {
  background:"#fff",
  padding:30,
  borderRadius:18,
  width:"min(360px, calc(100vw - 32px))",
  textAlign:"center"
};
const modalSub = { color:"#64748b", fontSize:14, fontWeight:700, marginBottom:16 };

const scoreRow = { alignItems:"end", display:"flex", justifyContent:"center", gap:10 };
const scoreLabel = { color:"#475569", display:"grid", fontSize:12, fontWeight:800, gap:6, minWidth:0 };

const scoreInput = { border:"1px solid #cbd5e1", borderRadius:10, fontSize:22, fontWeight:900, padding:10, textAlign:"center", width:76 };

const modalBtns = { marginTop:20, display:"flex", gap:10, justifyContent:"center" };

const saveBtn = { background:"#16a34a", border:"none", color:"#fff", cursor:"pointer", fontWeight:800, padding:"10px 14px", borderRadius:10 };
const cancelBtn = { background:"#e5e7eb", border:"none", color:"#111827", cursor:"pointer", fontWeight:800, padding:"10px 14px", borderRadius:10 };
