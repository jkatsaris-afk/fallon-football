import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

/* 🔥 TEAM LOGOS */
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
};

export default function RefSchedulePage() {
  const [games, setGames] = useState([]);
  const [refs, setRefs] = useState([]);
  const [assignments, setAssignments] = useState([]);
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

  /* GROUP ASSIGNMENTS */
  const assignmentsByGame = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (!map[a.game_id]) map[a.game_id] = [];
      map[a.game_id].push(a);
    });
    return map;
  }, [assignments]);

  /* WEEK FILTER */
  const weeks = [...new Set(games.map((g) => g.week).filter(Boolean))];

  const filteredGames =
    week === "all" ? games : games.filter((g) => g.week === week);

  /* ASSIGN */
  const assignRef = async (gameId, slot) => {
    const key = `${gameId}-${slot}`;
    const refereeId = selectedRefs[key];
    if (!refereeId) return;

    const existing = assignmentsByGame[gameId] || [];
    const current = existing[slot];

    if (current) {
      await supabase
        .from("ref_assignments")
        .update({ referee_id: refereeId })
        .eq("id", current.id);
    } else {
      await supabase.from("ref_assignments").insert({
        game_id: gameId,
        referee_id: refereeId,
        role: slot === 0 ? "Ref 1" : "Ref 2",
      });
    }

    loadData();
  };

  if (loading) return <div style={wrap}>Loading...</div>;

  return (
    <div style={wrap}>

      {/* 🔥 WEEK FILTER TILE */}
      <div style={filterTile}>
        <div style={filterLabel}>Week Filter</div>

        <div style={filterOptions}>
          <button
            style={week === "all" ? activeFilterBtn : filterBtn}
            onClick={() => setWeek("all")}
          >
            All
          </button>

          {weeks.map((w) => (
            <button
              key={w}
              style={week === w ? activeFilterBtn : filterBtn}
              onClick={() => setWeek(w)}
            >
              Week {w}
            </button>
          ))}
        </div>
      </div>

      {/* 🔥 GAME GRID */}
      <div style={grid}>
        {filteredGames.map((game) => {
          const gameAssignments = assignmentsByGame[game.id] || [];

          const homeLogo = TEAM_LOGOS[game.team];
          const awayLogo = TEAM_LOGOS[game.opponent];

          return (
            <div key={game.id} style={card}>

              {/* 🔥 LOGO HEADER */}
              <div style={logoRow}>
                {homeLogo && <img src={homeLogo} style={logo} />}
                <div style={vs}>VS</div>
                {awayLogo && <img src={awayLogo} style={logo} />}
              </div>

              {/* GAME INFO */}
              <div style={gameTitle}>
                {game.team} vs {game.opponent}
              </div>

              <div style={gameMeta}>
                {game.event_date} • {game.time} • {game.field}
              </div>

              {/* REF SLOTS */}
              {[0, 1].map((slot) => {
                const assignment = gameAssignments[slot];
                const key = `${game.id}-${slot}`;

                return (
                  <div key={slot} style={slotRow}>

                    <div style={slotLabel}>
                      {slot === 0 ? "Ref 1" : "Ref 2"}
                    </div>

                    <select
                      value={selectedRefs[key] || ""}
                      onChange={(e) =>
                        setSelectedRefs((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      style={select}
                    >
                      <option value="">
                        {assignment ? "Change Ref" : "Assign Ref"}
                      </option>

                      {refs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.first_name} {r.last_name}
                        </option>
                      ))}
                    </select>

                    <button
                      style={btn}
                      onClick={() => assignRef(game.id, slot)}
                    >
                      Save
                    </button>

                  </div>
                );
              })}

            </div>
          );
        })}
      </div>

    </div>
  );
}

/* 🔥 STYLES */

const wrap = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const filterTile = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

const filterLabel = {
  fontWeight: 700,
  marginBottom: 10,
};

const filterOptions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const filterBtn = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  cursor: "pointer",
};

const activeFilterBtn = {
  ...filterBtn,
  background: "#16a34a",
  color: "#fff",
  border: "none",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 16,
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

const logoRow = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const logo = {
  width: 40,
  height: 40,
  objectFit: "contain",
};

const vs = {
  fontWeight: 700,
  fontSize: 12,
};

const gameTitle = {
  textAlign: "center",
  fontWeight: 700,
};

const gameMeta = {
  textAlign: "center",
  fontSize: 12,
  color: "#64748b",
};

const slotRow = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 10,
};

const slotLabel = {
  width: 60,
  fontWeight: 600,
};

const select = {
  flex: 1,
  padding: 6,
  borderRadius: 8,
};

const btn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer",
};
