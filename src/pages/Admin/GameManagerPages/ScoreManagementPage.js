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
    if (!homeScore || !awayScore) return;

    await supabase.from("game_scores").insert({
      schedule_id: modalGame.id,
      home_team: modalGame.team,
      away_team: modalGame.opponent,
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore)
    });

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

              {!final && (
                <button style={btn} onClick={() => openModal(g)}>
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

      {/* 🔥 MODAL */}
      {modalGame && (
        <div style={overlay}>
          <div style={modal}>

            <h2 style={{ textAlign: "center" }}>
              {modalGame.team} vs {modalGame.opponent}
            </h2>

            <div style={scoreRow}>
              <input
                type="number"
                placeholder="Home"
                value={homeScore}
                onChange={(e)=>setHomeScore(e.target.value)}
                style={scoreInput}
              />

              <span style={{ fontWeight:700 }}>-</span>

              <input
                type="number"
                placeholder="Away"
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

const btn = {
  marginTop:10,
  padding:"8px 12px",
  borderRadius:8,
  background:"#16a34a",
  color:"#fff",
  border:"none"
};

const finalBadge = {
  marginTop:10,
  padding:"6px 10px",
  borderRadius:8,
  background:"#e5e7eb",
  textAlign:"center"
};

/* MODAL */
const overlay = {
  position:"fixed",
  top:0,
  left:0,
  right:0,
  bottom:0,
  background:"rgba(0,0,0,0.5)",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  zIndex:1000
};

const modal = {
  background:"#fff",
  padding:30,
  borderRadius:18,
  width:300,
  textAlign:"center"
};

const scoreRow = {
  display:"flex",
  justifyContent:"center",
  alignItems:"center",
  gap:10,
  marginTop:20
};

const scoreInput = {
  width:70,
  padding:10,
  textAlign:"center",
  fontSize:18
};

const modalBtns = {
  marginTop:20,
  display:"flex",
  gap:10,
  justifyContent:"center"
};

const saveBtn = {
  background:"#16a34a",
  color:"#fff",
  padding:"8px 12px",
  borderRadius:8,
  border:"none"
};

const cancelBtn = {
  background:"#e5e7eb",
  padding:"8px 12px",
  borderRadius:8,
  border:"none"
};
