import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

export default function ScoreRecordsPage() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("game_scores")
      .select("*")
      .order("created_at", { ascending: false });

    setGames(data || []);
  };

  return (
    <div>

      <h2 style={title}>Score Records</h2>

      <div style={grid}>
        {games.map(g => (
          <div key={g.id} style={card}>
            <div style={matchup}>
              {g.home_team} vs {g.away_team}
            </div>

            <div style={score}>
              {g.home_score} - {g.away_score}
            </div>
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
  background: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const matchup = { fontWeight: 700 };
const score = { fontSize: 18, marginTop: 6 };

const title = { fontSize: 22, fontWeight: 700 };
