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

  const assignRef = async (gameId, slot, refereeId) => {
    const role = slot === 0 ? "Ref 1" : "Ref 2";

    const { data: existing } = await supabase
      .from("ref_assignments")
      .select("*")
      .eq("game_id", gameId)
      .eq("role", role)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ref_assignments")
        .update({ referee_id: refereeId })
        .eq("id", existing.id);
    } else {
      await supabase.from("ref_assignments").insert({
        game_id: gameId,
        referee_id: refereeId,
        role,
      });
    }

    loadData();
  };

  if (loading) return <div style={wrap}>Loading...</div>;

  return (
    <div style={wrap}>

      <div style={statsGrid}>
        <FilterTile label="All" value={games.length} active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterTile label="Open" value={games.filter(g=>(assignmentsByGame[g.id]||[]).length===0).length} active={filter==="open"} onClick={()=>setFilter("open")} />
        <FilterTile label="1 Ref" value={games.filter(g=>(assignmentsByGame[g.id]||[]).length===1).length} active={filter==="partial"} onClick={()=>setFilter("partial")} />
        <FilterTile label="2 Refs" value={games.filter(g=>(assignmentsByGame[g.id]||[]).length>=2).length} active={filter==="full"} onClick={()=>setFilter("full")} />

        {/* 🔥 ONLY FIX */}
        <ActionTile
          label="Auto Assign"
          desc="Open workflow"
          onClick={() => setAdminPage("autoAssign")}
        />
      </div>

      <div style={weekTileGrid}>
        <WeekTile label="All Weeks" active={week==="all"} onClick={()=>setWeek("all")} />
        {weeks.map((w)=>(
          <WeekTile key={w} label={`Week ${w}`} active={String(week)===String(w)} onClick={()=>setWeek(w)} />
        ))}
      </div>

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
