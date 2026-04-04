import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function GameSelector() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date")
      .order("event_time");

    if (error) {
      console.error("Load error:", error);
      return;
    }

    // only games (not practices)
    const filtered = (data || []).filter(
      (g) => (g.event_type || "").toLowerCase() === "game"
    );

    console.log("Loaded games:", filtered);

    setGames(filtered);
  }

  async function startGame(game) {
    console.log("START CLICKED:", game);

    if (!game?.id) {
      console.error("❌ Missing game.id");
      return;
    }

    // check if already exists
    const { data: existing, error: checkError } = await supabase
      .from("games_live")
      .select("*")
      .eq("schedule_id", game.id)
      .maybeSingle();

    if (checkError) {
      console.error("Check error:", checkError);
      return;
    }

    if (existing) {
      console.log("✅ Already exists:", existing);
      return;
    }

    // insert new game
    const { data, error } = await supabase
      .from("games_live")
      .insert([
        {
          schedule_id: game.id,
          home_score: 0,
          away_score: 0,
          half: 1,
          clock: "24:00",
          status: "live",
        },
      ])
      .select();

    if (error) {
      console.error("INSERT ERROR:", error);
      return;
    }

    console.log("✅ INSERT SUCCESS:", data);
  }

  return (
    <div style={container}>
      <h2>Game Selector</h2>

      {games.length === 0 && <p>No games found</p>}

      {games.map((g) => (
        <div key={g.id} style={card}>
          <div style={title}>
            {g.team} vs {g.opponent}
          </div>

          <div style={sub}>
            {g.event_date} — {g.event_time}
          </div>

          <button style={btn} onClick={() => startGame(g)}>
            Start Game
          </button>
        </div>
      ))}
    </div>
  );
}

// ===== STYLES =====
const container = {
  padding: 20,
};

const card = {
  background: "#fff",
  padding: 15,
  borderRadius: 10,
  marginBottom: 10,
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const title = {
  fontWeight: "bold",
};

const sub = {
  fontSize: 12,
  color: "#666",
};

const btn = {
  marginTop: 10,
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
};
