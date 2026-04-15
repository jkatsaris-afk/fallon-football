import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";

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

  /* ASSIGN REF */
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

      {/* FILTER TILE */}
      <div style={filterRow}>
        <select
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          style={select}
        >
          <option value="all">All Weeks</option>
          {weeks.map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
      </div>

      {/* GAME TILES */}
      <div style={grid}>
        {filteredGames.map((game) => {
          const gameAssignments = assignmentsByGame[game.id] || [];

          return (
            <div key={game.id} style={card}>

              <div style={gameHeader}>
                <div style={gameTitle}>
                  {game.team} vs {game.opponent}
                </div>
                <div style={gameMeta}>
                  {game.event_date} • {game.time} • {game.field}
                </div>
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

/* 🔥 STYLES — YOUR TILE STYLE */

const wrap = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const filterRow = {
  display: "flex",
  justifyContent: "flex-start",
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

const gameHeader = {
  marginBottom: 12,
};

const gameTitle = {
  fontWeight: 700,
  fontSize: 16,
};

const gameMeta = {
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
