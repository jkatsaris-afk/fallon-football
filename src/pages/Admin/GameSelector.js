import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function GameSelector({ onGameStart }) {
  const [games, setGames] = useState([]);
  const [openDate, setOpenDate] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*")
      .ilike("event_type", "%game%");

    console.log("LOAD:", data, error);

    if (!data) return;

    const cleaned = data.map(g => ({
      ...g,
      clean_date: normalizeDate(g.event_date),
    }));

    setGames(cleaned);
  }

  async function startGame(game) {
    console.log("START CLICKED:", game);

    if (!game?.id) {
      console.error("❌ Missing game ID");
      return;
    }

    // check existing
    const { data: existing, error: checkError } = await supabase
      .from("games_live")
      .select("*")
      .eq("schedule_id", game.id)
      .maybeSingle();

    console.log("CHECK:", existing, checkError);

    if (existing) {
      onGameStart(existing, game);
      return;
    }

    // insert
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
      .select();

    console.log("INSERT:", data, error);

    if (error) {
      console.error("❌ INSERT FAILED:", error);
      return;
    }

    if (!data || data.length === 0) {
      console.error("❌ NO DATA RETURNED (RLS issue)");
      return;
    }

    onGameStart(data[0], game);
  }

  // ===== GROUP BY DATE (FIXED) =====
  const grouped = Object.values(
    games.reduce((acc, g) => {
      if (!g.clean_date) return acc;

      const date = formatDate(g.clean_date);

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
            day.games
              .sort((a, b) => toTime(a.event_time) - toTime(b.event_time))
              .map((g) => (
                <div key={g.id} style={gameRow}>

                  <div style={teams}>
                    {g.team} vs {g.opponent || "TBD"}
                  </div>

                  <div style={time}>
                    {g.event_time}
                  </div>

                  <button
                    style={startBtn}
                    onClick={(e) => {
                      e.stopPropagation(); // 🔥 FIX
                      startGame(g);
                    }}
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

/* ===== HELPERS ===== */

function normalizeDate(dateStr) {
  if (!dateStr) return null;

  if (dateStr.includes("-")) return dateStr;

  const [m, d, y] = dateStr.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function toTime(timeStr) {
  if (!timeStr) return 0;

  const [time, mod] = timeStr.split(" ");
  let [h, m] = time.split(":");

  if (mod === "PM" && h !== "12") h = +h + 12;
  if (mod === "AM" && h === "12") h = "00";

  return parseInt(h) * 60 + parseInt(m);
}

/* ===== STYLES ===== */

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
  cursor: "pointer",
};
