import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [liveGame, setLiveGame] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: true })
      .order("game_time", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    console.log("GAMES FROM DB:", data);

    // 🔥 FIX DATE + TEAM NAMES
    const fixed = data.map((g) => ({
      ...g,

      // FIX DATE SHIFT
      display_date: new Date(g.game_date + "T00:00:00")
        .toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),

      display_time: g.game_time,

      // HANDLE DIFFERENT COLUMN NAMES
      team1: g.team1 || g.home_team || g.team_1 || "Team A",
      team2: g.team2 || g.away_team || g.team_2 || "Team B",
    }));

    setGames(fixed);
  }

  // ================= GROUP DATE → TIME =================
  const grouped = Object.values(
    games.reduce((acc, g) => {
      if (!acc[g.display_date]) {
        acc[g.display_date] = { date: g.display_date, times: {} };
      }

      if (!acc[g.display_date].times[g.display_time]) {
        acc[g.display_date].times[g.display_time] = [];
      }

      acc[g.display_date].times[g.display_time].push(g);

      return acc;
    }, {})
  );

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>

      {/* LEFT PANEL (leave your scoreboard here) */}
      <div style={{ flex: 2, background: "#fff", borderRadius: 16, padding: 20 }}>
        <h2>Scoreboard</h2>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div
        style={{
          flex: 1,
          background: "#ffffff",
          borderRadius: 16,
          padding: 20,
          overflowY: "auto",
        }}
      >
        <h3>Games</h3>

        {grouped.map((day) => (
          <div key={day.date} style={{ marginBottom: 20 }}>
            <h4 style={{ marginBottom: 10 }}>{day.date}</h4>

            {Object.entries(day.times).map(([time, gamesAtTime]) => (
              <div key={time} style={{ marginBottom: 10 }}>

                {/* TIME HEADER */}
                <div
                  style={{
                    fontWeight: "600",
                    marginBottom: 5,
                    color: "#64748b",
                  }}
                >
                  {time}
                </div>

                {/* GAMES */}
                {gamesAtTime.map((g) => (
                  <div
                    key={g.id}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 10,
                      background: "#f1f5f9",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedGame(g)}
                  >
                    <strong>
                      {g.team1} vs {g.team2}
                    </strong>

                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {g.field || ""} {g.division ? `• ${g.division}` : ""}
                    </div>

                    <button
                      style={{
                        marginTop: 6,
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "none",
                        background: "#2f6ea6",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGame(g);
                      }}
                    >
                      Start Game
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
