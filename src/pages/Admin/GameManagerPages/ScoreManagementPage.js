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

const normalize = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase();
  if (lower.includes("49")) return "49ers";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const getWeek = (dateStr) => {
  if (!dateStr) return 1;
  const start = new Date("2026-03-01");
  const gameDate = new Date(dateStr);
  const diff = Math.floor((gameDate - start) / (1000 * 60 * 60 * 24));
  return Math.floor(diff / 7) + 1;
};

export default function ScoreManagementPage({ setGameId, setTab }) {
  const [games, setGames] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [finalGames, setFinalGames] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("all");

  useEffect(() => {
    loadGames();
    loadLiveGames();
    loadFinalGames();
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .ilike("event_type", "%game%");

    setGames(data || []);
  };

  const loadLiveGames = async () => {
    const { data } = await supabase
      .from("games_live")
      .select("*");

    setLiveGames(data || []);
  };

  const loadFinalGames = async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("*");

    setFinalGames(data || []);
  };

  const startGame = async (game) => {
    const { data } = await supabase.from("games_live")
      .insert({
        schedule_id: game.id,
        home_team: game.team,
        away_team: game.opponent,
        home_score: 0,
        away_score: 0,
        status: "live"
      })
      .select()
      .single();

    setGameId(data.id);
    setTab("live");
  };

  const resumeGame = (game) => {
    const existing = liveGames.find(g => g.schedule_id === game.id);
    if (!existing) return;
    setGameId(existing.id);
    setTab("live");
  };

  const enterFinal = async (game) => {
    const home = prompt("Home Score?");
    const away = prompt("Away Score?");
    if (!home || !away) return;

    await supabase.from("game_scores").insert({
      schedule_id: game.id,
      home_team: game.team,
      away_team: game.opponent,
      home_score: parseInt(home),
      away_score: parseInt(away)
    });

    loadFinalGames();
  };

  const getStatus = (game) => {
    if (finalGames.find(g => g.schedule_id === game.id)) return "final";
    if (liveGames.find(g => g.schedule_id === game.id)) return "live";
    return "not-started";
  };

  const gamesWithWeek = useMemo(() => {
    return games.map(g => ({ ...g, week: getWeek(g.event_date) }));
  }, [games]);

  const weeks = useMemo(() => {
    const unique = [...new Set(gamesWithWeek.map(g => g.week))];
    return ["all", ...unique.sort((a,b)=>a-b)];
  }, [gamesWithWeek]);

  const filteredGames = useMemo(() => {
    if (selectedWeek === "all") return gamesWithWeek;
    return gamesWithWeek.filter(g => g.week === selectedWeek);
  }, [gamesWithWeek, selectedWeek]);

  return (
    <div style={wrap}>

      <div style={weekGrid}>
        {weeks.map(w => (
          <div
            key={w}
            style={{ ...weekTile, ...(selectedWeek === w ? activeTile : {}) }}
            onClick={() => setSelectedWeek(w)}
          >
            {w === "all" ? "All" : `Week ${w}`}
          </div>
        ))}
      </div>

      <div style={grid}>
        {filteredGames.map(g => {
          const home = normalize(g.team);
          const away = normalize(g.opponent);
          const status = getStatus(g);

          return (
            <div key={g.id} style={card}>

              <div style={matchupRow}>
                <Team logo={TEAM_LOGOS[home]} name={home} />
                <div style={vs}>VS</div>
                <Team logo={TEAM_LOGOS[away]} name={away} />
              </div>

              <div style={sub}>
                Week {g.week} • {g.event_time} • {g.field}
              </div>

              {status === "not-started" && (
                <div style={btnRow}>
                  <button style={btn} onClick={() => startGame(g)}>
                    Start Game
                  </button>
                  <button style={btnGray} onClick={() => enterFinal(g)}>
                    Enter Final
                  </button>
                </div>
              )}

              {status === "live" && (
                <button style={btnBlue} onClick={() => resumeGame(g)}>
                  Resume Game
                </button>
              )}

              {status === "final" && (
                <div style={finalBadge}>Final</div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}

/* COMPONENTS */
function Team({ logo, name }) {
  return (
    <div style={teamWrap}>
      {logo && <img src={logo} style={logoStyle} />}
      <div>{name}</div>
    </div>
  );
}

/* STYLES */
const wrap = { display:"flex", flexDirection:"column", gap:20 };

const weekGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(100px,1fr))",
  gap:10
};

const weekTile = {
  background:"#fff",
  padding:10,
  borderRadius:12,
  textAlign:"center",
  cursor:"pointer"
};

const activeTile = { outline:"2px solid #16a34a" };

const grid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(240px,1fr))",
  gap:16
};

const card = {
  padding:16,
  borderRadius:16,
  background:"#f8fafc",
  boxShadow:"0 6px 18px rgba(0,0,0,0.06)"
};

const matchupRow = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center"
};

const vs = { fontWeight:700 };

const teamWrap = {
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  gap:6
};

const logoStyle = { width:32, height:32 };

const sub = { fontSize:12, color:"#64748b", marginTop:8 };

const btnRow = { display:"flex", gap:8, marginTop:10 };

const btn = {
  padding:"8px 12px",
  borderRadius:8,
  background:"#16a34a",
  color:"#fff",
  border:"none"
};

const btnGray = {
  padding:"8px 12px",
  borderRadius:8,
  background:"#6b7280",
  color:"#fff",
  border:"none"
};

const btnBlue = {
  marginTop:10,
  padding:"8px 12px",
  borderRadius:8,
  background:"#2563eb",
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
