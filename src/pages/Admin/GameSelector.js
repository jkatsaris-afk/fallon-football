import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function GameSelector({ onGameStart }) {
  const [games, setGames] = useState([]);
  const [openDate, setOpenDate] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .ilike("event_type", "%game%")
      .order("event_date")
      .order("event_time");

    setGames(data || []);
  }

  async function startGame(game) {
    const { data: existing } = await supabase
      .from("games_live")
      .select("*")
      .eq("schedule_id", game.id)
      .maybeSingle();

    if (existing) {
      onGameStart(existing, game);
      return;
    }

    const { data, error } = await supabase
      .from("games_live")
      .insert([
        {
          schedule_id: game.id,
          home_score: 0,
          away_score: 0,
          half: 1,
          clock: "24:00",
        },
      ])
      .select()
      .single();

    if (!error) onGameStart(data, game);
  }

  // group by date (like your schedule page)
  const grouped = Object.values(
    games.reduce((acc, g) => {
      const date = new Date(g.event_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      if (!acc[date]) acc[date] = { date, games: [] };

      acc[date].games.push(g);
      return acc;
    }, {})
  );

  return (
    <div style={container}>

      <h3 style={{ marginBottom: 10 }}>Games</h3>

      {grouped.map((day) => (
        <div key={day.date}>

          {/* DATE HEADER */}
          <div
            style={dateHeader}
            onClick={() =>
              setOpenDate(openDate === day.date ? null : day.date)
            }
          >
            {day.date}
          </div>

          {/* GAMES */}
          {openDate === day.date &&
            day.games.map((g) => (
              <div key={g.id} style={gameRow}>

                <div style={teams}>
                  {g.team} vs {g.opponent}
                </div>

                <div style={time}>
                  {g.event_time}
                </div>

                <button
                  style={startBtn}
                  onClick={() => startGame(g)}
                >
                  Start
                </button>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

// ===== STYLES =====

const container = {
  width: 280,
  padding: 15,
  background: "#ffffff",
  borderRight: "1px solid #e5e7eb",
  overflowY: "auto",
};

const dateHeader = {
  fontWeight: "600",
  padding: "10px 5px",
  cursor: "pointer",
  color: "#0f172a",
};

const gameRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 5px",
  borderBottom: "1px solid #f1f5f9",
};

const teams = {
  fontSize: 13,
  fontWeight: 500,
};

const time = {
  fontSize: 11,
  color: "#64748b",
};

const startBtn = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  fontSize: 12,
};
