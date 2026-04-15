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

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>

      {/* 🔥 BUTTON FIX */}
      <button
        onClick={() => setAdminPage("autoAssign")}
        style={{
          padding: 12,
          borderRadius: 10,
          background: "#16a34a",
          color: "#fff",
          border: "none",
          marginBottom: 20,
          cursor: "pointer"
        }}
      >
        Auto Assign
      </button>

      {filteredGames.map((game) => (
        <div key={game.id} style={{ marginBottom: 16 }}>
          <div>
            {game.team} vs {game.opponent}
          </div>

          <div>
            Week {game.week} • {game.time} • {game.field}
          </div>

          {/* 🔥 DIVISION */}
          <div>
            {game.division || "No Division"}
          </div>
        </div>
      ))}

    </div>
  );
}
