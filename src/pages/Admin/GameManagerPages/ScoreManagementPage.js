import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

export default function ScoreManagementPage() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .ilike("event_type", "%game%");

    setGames(data || []);
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
  };

  return (
    <div>

      <h2 style={title}>Score Management</h2>

      <div style={grid}>
        {games.map(g => (
          <div key={g.id} style={card}>
            <div style={matchup}>
              {g.team} vs {g.opponent}
            </div>

            <div style={sub}>
              {g.event_date} • {g.event_time} • {g.field}
            </div>

            <button style={btn} onClick={() => startGame(g)}>
              Start Game
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

/* STYLES */
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
  gap: 16
};

const card = {
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const matchup = { fontWeight: 700 };
const sub = { fontSize: 12, color: "#64748b", marginTop: 4 };

const btn = {
  marginTop: 10,
  padding: "8px 12px",
  borderRadius: 8,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};

const title = { fontSize: 22, fontWeight: 700 };
