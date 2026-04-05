import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function GameManager() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .ilike("event_type", "%game%")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });

    setGames(data || []);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Game Manager</h2>

      <div style={{ marginTop: 20 }}>
        {games.map((g) => (
          <div
            key={g.id}
            style={{
              background: "#fff",
              padding: 15,
              borderRadius: 12,
              marginBottom: 10,
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {g.home_team} vs {g.away_team}
            </div>

            <div style={{ fontSize: 13, color: "#64748b" }}>
              {g.event_date} • {g.event_time} • {g.field}
            </div>

            <button
              style={{
                marginTop: 10,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#2f6ea6",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              Open Scoreboard
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
