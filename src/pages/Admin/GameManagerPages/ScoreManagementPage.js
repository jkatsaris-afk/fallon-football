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

export default function ScoreManagementPage() {
  const [games, setGames] = useState([]);
  const [finalGames, setFinalGames] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("all");

  const [modalGame, setModalGame] = useState(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  useEffect(() => {
    loadGames();
    loadFinalGames();
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%game%");

    setGames(data || []);
  };

  const loadFinalGames = async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("*");

    setFinalGames(data || []);
  };

  const openModal = (game) => {
    setModalGame(game);
    setHomeScore("");
    setAwayScore("");
  };

  const saveScore = async () => {
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(home) || isNaN(away)) {
      alert("Enter valid scores");
      return;
    }

    const { error } = await supabase.from("game_scores").insert({
      schedule_id: modalGame.id,
      home_team: modalGame.team,
      away_team: modalGame.opponent,
      home_score: home,
      away_score: away
    });

    if (error) {
      console.error("SAVE ERROR:", error);
      alert("Error saving score: " + error.message);
      return;
    }

    setModalGame(null);
    loadFinalGames();
  };

  const isFinal = (game) => {
    return finalGames.find(g => g.schedule_id === game.id);
  };

  const weeks = useMemo(() => {
    const unique = [...new Set(games.map(g => g.week).filter(Boolean))];
    return ["all", ...unique.sort((a,b)=>a-b), "championship"];
  }, [games]);

  const filteredGames = useMemo(() => {
    if (selectedWeek === "all") return games;

    if (selectedWeek === "championship") {
      return games.filter(g =>
        (g.event_type || "").toLowerCase().includes("champ")
      );
    }

    return games.filter(g => String(g.week) === String(selectedWeek));
  }, [games, selectedWeek]);

  return (
    <div style={wrap}>

      {/* WEEK FILTER */}
      <div style={weekTileGrid}>
        {weeks.map(w => (
          <WeekTile
            key={w}
            label={
              w === "all"
                ? "All Weeks"
                : w === "championship"
                ? "Championships"
                : `Week ${w}`
            }
            active={selectedWeek === w}
            onClick={() => setSelectedWeek(w)}
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
                <div style={finalBadge}>
                  Final: {final.home_score} - {final.away_score}
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

            <div style={scoreRow}>
              <input
                type="number"
                value={homeScore}
                onChange={(e)=>setHomeScore(e.target.value)}
                style={scoreInput}
              />
              <span>-</span>
              <input
                type="number"
                value={awayScore}
                onChange={(e)=>setAwayScore(e.target.value)}
                style={scoreInput}
              />
            </div>

            <div style={modalBtns}>
              <button style={saveBtn} onClick={saveScore}>
                Save Score
              </button>

              <button style={cancelBtn} onClick={()=>setModalGame(null)}>
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
function WeekTile({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ ...weekTile, ...(active ? activeWeekTile : {}) }}
    >
      {label}
    </button>
  );
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
  width:300,
  textAlign:"center"
};

const scoreRow = { display:"flex", justifyContent:"center", gap:10 };

const scoreInput = { width:60, padding:10, textAlign:"center" };

const modalBtns = { marginTop:20, display:"flex", gap:10, justifyContent:"center" };

const saveBtn = { background:"#16a34a", color:"#fff", padding:"8px 12px", borderRadius:8 };
const cancelBtn = { background:"#e5e7eb", padding:"8px 12px", borderRadius:8 };
