import React, { useState } from "react";

export default function ScoreboardManager({ adminView }) {
  const isPhone = adminView === "phone";

  // 🔥 SAMPLE DATA (replace later with Supabase)
  const games = [
    { id: 1, time: "9:00 AM", team1: "Steelers", team2: "Raiders" },
    { id: 2, time: "9:00 AM", team1: "Cowboys", team2: "Eagles" },
    { id: 3, time: "10:00 AM", team1: "49ers", team2: "Packers" },
  ];

  // ✅ SELECTED GAME STATE
  const [selectedGame, setSelectedGame] = useState(null);

  // ✅ GROUP GAMES BY TIME
  const groupedByTime = Object.values(
    games.reduce((acc, game) => {
      if (!acc[game.time]) {
        acc[game.time] = { time: game.time, games: [] };
      }
      acc[game.time].games.push(game);
      return acc;
    }, {})
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isPhone ? "column" : "row",
        height: "80vh",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* ================= LEFT PANEL ================= */}
      <div
        style={{
          flex: 1,
          padding: 20,
          borderRight: isPhone ? "none" : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h2>Score Entry</h2>

        {!selectedGame && (
          <p style={{ opacity: 0.7 }}>
            Select a game from the right to enter scores
          </p>
        )}

        {selectedGame && (
          <div>
            <h3>
              {selectedGame.team1} vs {selectedGame.team2}
            </h3>

            <div style={{ marginTop: 20 }}>
              <label>{selectedGame.team1} Score</label>
              <input
                type="number"
                style={{
                  width: "100%",
                  padding: 10,
                  marginTop: 5,
                  marginBottom: 15,
                  borderRadius: 8,
                  border: "none",
                }}
              />

              <label>{selectedGame.team2} Score</label>
              <input
                type="number"
                style={{
                  width: "100%",
                  padding: 10,
                  marginTop: 5,
                  borderRadius: 8,
                  border: "none",
                }}
              />

              <button
                style={{
                  marginTop: 20,
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "#2f6ea6",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Save Score
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div
        style={{
          width: isPhone ? "100%" : 320,
          padding: 20,
          overflowY: "auto",
        }}
      >
        <h3>Games</h3>

        {groupedByTime.map((block) => (
          <div key={block.time} style={{ marginBottom: 20 }}>
            <h4 style={{ opacity: 0.6 }}>{block.time}</h4>

            {block.games.map((game) => (
              <div
                key={game.id}
                onClick={() => setSelectedGame(game)}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 10,
                  background:
                    selectedGame?.id === game.id
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
              >
                {game.team1} vs {game.team2}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
