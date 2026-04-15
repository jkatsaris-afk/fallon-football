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

export default function RefereeSchedulePage({ setAdminPage }) {

  const [games, setGames] = useState([]);
  const [refs, setRefs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [week, setWeek] = useState("all");
  const [selectedRefs, setSelectedRefs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: gameData } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%game%");

    const { data: refData } = await supabase
      .from("referees")
      .select("*")
      .eq("status", "approved");

    const { data: assignmentData } = await supabase
      .from("ref_assignments")
      .select("*");

    setGames(gameData || []);
    setRefs(refData || []);
    setAssignments(assignmentData || []);
    setLoading(false);
  };

  const assignmentsByGame = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (!map[a.game_id]) map[a.game_id] = [];
      map[a.game_id].push(a);
    });
    return map;
  }, [assignments]);

  const weeks = [
    ...new Set(games.map((g) => g.week).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));

  const filteredGames = useMemo(() => {
    let filtered = [...games];

    if (filter === "open") {
      filtered = filtered.filter(
        (g) => (assignmentsByGame[g.id] || []).length === 0
      );
    }

    if (filter === "partial") {
      filtered = filtered.filter(
        (g) => (assignmentsByGame[g.id] || []).length === 1
      );
    }

    if (filter === "full") {
      filtered = filtered.filter(
        (g) => (assignmentsByGame[g.id] || []).length >= 2
      );
    }

    if (week !== "all") {
      filtered = filtered.filter((g) => String(g.week) === String(week));
    }

    return filtered;
  }, [games, filter, week, assignmentsByGame]);

  if (loading) return <div style={wrap}>Loading...</div>;

  return (
    <div style={wrap}>

      {/* TOP TILE ROW */}
      <div style={statsGrid}>
        <FilterTile label="All" value={games.length} active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterTile label="Open" value={games.filter(g=>(assignmentsByGame[g.id]||[]).length===0).length} active={filter==="open"} onClick={()=>setFilter("open")} />
        <FilterTile label="1 Ref" value={games.filter(g=>(assignmentsByGame[g.id]||[]).length===1).length} active={filter==="partial"} onClick={()=>setFilter("partial")} />
        <FilterTile label="2 Refs" value={games.filter(g=>(assignmentsByGame[g.id]||[]).length>=2).length} active={filter==="full"} onClick={()=>setFilter("full")} />

        {/* FIXED BUTTON */}
        <ActionTile
          label="Auto Assign"
          desc="Open workflow"
          onClick={() => setAdminPage("autoAssign")}
        />
      </div>

      {/* WEEK FILTER */}
      <div style={weekTileGrid}>
        <WeekTile label="All Weeks" active={week==="all"} onClick={()=>setWeek("all")} />
        {weeks.map((w)=>(
          <WeekTile key={w} label={`Week ${w}`} active={String(week)===String(w)} onClick={()=>setWeek(w)} />
        ))}
      </div>

      {/* GAME GRID */}
      <div style={grid}>
        {filteredGames.map((game)=>{

          const homeLogo = TEAM_LOGOS[game.team];
          const awayLogo = TEAM_LOGOS[game.opponent];

          return (
            <div key={game.id} style={card}>

              <div style={logoRow}>
                {homeLogo && <img src={homeLogo} style={logo} />}
                <div style={vs}>VS</div>
                {awayLogo && <img src={awayLogo} style={logo} />}
              </div>

              <div style={gameTitle}>
                {game.team} vs {game.opponent}
              </div>

              <div style={gameMeta}>
                Week {game.week} • {game.time} • {game.field}
              </div>

              <div style={divisionBadge}>
                {game.division || "No Division"}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

/* COMPONENTS (UNCHANGED) */

function FilterTile({ label, value, active, onClick }) {
  return (
    <button onClick={onClick} style={{...statTile, ...(active?activeStatTile:{})}}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </button>
  );
}

function ActionTile({ label, desc, onClick }) {
  return (
    <button onClick={onClick} style={actionTile}>
      <div style={actionTitle}>{label}</div>
      <div style={actionDesc}>{desc}</div>
    </button>
  );
}

function WeekTile({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{...weekTile, ...(active?activeWeekTile:{})}}>
      {label}
    </button>
  );
}

/* STYLES (RESTORED) */

const wrap = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 20
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
  gap: 12
};

const weekTileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
  gap: 10
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

const logo = {
  width: 40
};

const vs = {
  fontWeight: 700
};

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

const statTile = {
  background: "#fff",
  borderRadius: 18,
  padding: 16,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  border: "none"
};

const activeStatTile = {
  outline: "2px solid #16a34a"
};

const statValue = {
  fontSize: 22,
  fontWeight: 800
};

const statLabel = {
  fontSize: 12,
  color: "#64748b"
};

const actionTile = {
  background: "#16a34a",
  color: "#fff",
  borderRadius: 18,
  padding: 16,
  border: "none",
  cursor: "pointer"
};

const actionTitle = {
  fontSize: 18,
  fontWeight: 800
};

const actionDesc = {
  fontSize: 12
};

const weekTile = {
  background: "#fff",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  border: "none",
  fontWeight: 700
};

const activeWeekTile = {
  outline: "2px solid #2563eb"
};
