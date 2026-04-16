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

/* 🔥 normalize names */
const normalize = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase();

  if (lower.includes("49")) return "49ers";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export default function ScoreManagementPage() {
  const [games, setGames] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState("all");

  useEffect(() => {
    loadGames();
    loadLiveGames();
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

  const startGame = async (game) => {
    await supabase.from("games_live").insert({
      schedule_id: game.id,
      home_team: game.team,
      away_team: game.opponent,
      home_score: 0,
      away_score: 0,
      status: "live"
    });

    loadLiveGames();
  };

  /* 🔥 STATS */
  const stats = useMemo(() => {
    const total = games.length;
    const scored = liveGames.length;
    const unscored = total - scored;

    return { total, scored, unscored };
  }, [games, liveGames]);

  /* 🔥 WEEK LIST */
  const weeks = useMemo(() => {
    const unique = [...new Set(games.map(g => g.week || "Unknown"))];
    return ["all", ...unique];
  }, [games]);

  /* 🔥 FILTERED GAMES */
  const filteredGames = useMemo(() => {
    if (selectedWeek === "all") return games;
    return games.filter(g => g.week === selectedWeek);
  }, [games, selectedWeek]);

  return (
    <div style={wrap}>

      {/* 🔥 STATS */}
      <div style={statsGrid}>
        <StatTile label="Games Scored" value={stats.scored} />
        <StatTile label="Total Games" value={stats.total} />
        <StatTile label="Unscored Games" value={stats.unscored} />
      </div>

      {/* 🔥 WEEK FILTER */}
      <div style={weekGrid}>
        {weeks.map(w => (
          <div
            key={w}
            style={{
              ...weekTile,
              ...(selectedWeek === w ? activeTile : {})
            }}
            onClick={() => setSelectedWeek(w)}
          >
            {w === "all" ? "All" : `Week ${w}`}
          </div>
        ))}
      </div>

      {/* 🔥 GAME CARDS */}
      <div style={grid}>
        {filteredGames.map(g => {
          const home = normalize(g.team);
          const away = normalize(g.opponent);

          return (
            <div key={g.id} style={card}>

              <div style={matchupRow}>
                <Team logo={TEAM_LOGOS[home]} name={home} />
                <div style={vs}>VS</div>
                <Team logo={TEAM_LOGOS[away]} name={away} />
              </div>

              <div style={sub}>
                {g.event_date} • {g.event_time} • {g.field}
              </div>

              <button style={btn} onClick={() => startGame(g)}>
                Start Game
              </button>

            </div>
          );
        })}
      </div>

    </div>
  );
}

/* 🔥 TEAM BLOCK */
function Team({ logo, name }) {
  return (
    <div style={teamWrap}>
      {logo && <img src={logo} style={logoStyle} />}
      <div>{name}</div>
    </div>
  );
}

/* 🔥 STAT TILE */
function StatTile({ label, value }) {
  return (
    <div style={statTile}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

/* STYLES */

const wrap = { display: "flex", flexDirection: "column", gap: 20 };

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))",
  gap: 14
};

const statTile = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const statValue = { fontSize: 26, fontWeight: 800 };
const statLabel = { fontSize: 12, color: "#64748b" };

const weekGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(100px,1fr))",
  gap: 10
};

const weekTile = {
  background: "#fff",
  padding: 10,
  borderRadius: 12,
  textAlign: "center",
  cursor: "pointer"
};

const activeTile = {
  outline: "2px solid #16a34a"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))",
  gap: 16
};

const card = {
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const matchupRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const vs = { fontWeight: 700 };

const teamWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6
};

const logoStyle = { width: 32, height: 32 };

const sub = { fontSize: 12, color: "#64748b", marginTop: 8 };

const btn = {
  marginTop: 10,
  padding: "8px 12px",
  borderRadius: 8,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};
