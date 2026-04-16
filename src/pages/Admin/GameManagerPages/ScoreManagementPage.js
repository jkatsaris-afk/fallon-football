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

  useEffect(() => {
    loadGames();
    loadFinalGames();
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master_auto") // ✅ FIXED SOURCE
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

  const isFinal = (game) => {
    return finalGames.find(g => g.schedule_id === game.id);
  };

  /* 🔥 WEEK LIST (FROM DB) */
  const weeks = useMemo(() => {
    const unique = [
      ...new Set(games.map(g => g.week).filter(Boolean))
    ];

    return ["all", ...unique.sort((a, b) => Number(a) - Number(b)), "championship"];
  }, [games]);

  /* 🔥 FILTER */
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

              <div style={divisionBadge}>
                {g.division || "No Division"}
              </div>

              {!final && (
                <button style={btn} onClick={() => enterFinal(g)}>
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
const wrap = { padding: 20, display: "flex", flexDirection: "column", gap: 20 };

const weekTileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
  gap: 10
};

const weekTile = {
  background: "#fff",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "none",
  fontWeight: 700,
  cursor: "pointer"
};

const activeWeekTile = {
  outline: "2px solid #2563eb"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
  gap: 16
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const logoRow = {
  display: "flex",
  justifyContent: "center",
  gap: 10
};

const logo = { width: 40 };
const vs = { fontWeight: 700 };

const gameTitle = {
  textAlign: "center",
  fontWeight: 700,
  marginTop: 6
};

const gameMeta = {
  textAlign: "center",
  fontSize: 12,
  color: "#64748b"
};

const divisionBadge = {
  marginTop: 8,
  background: "rgba(59,130,246,0.12)",
  color: "#1d4ed8",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  textAlign: "center",
  fontWeight: 600
};

const btn = {
  marginTop: 10,
  padding: "8px 12px",
  borderRadius: 8,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};

const finalBadge = {
  marginTop: 10,
  padding: "6px 10px",
  borderRadius: 8,
  background: "#e5e7eb",
  textAlign: "center",
  fontWeight: 600
};
