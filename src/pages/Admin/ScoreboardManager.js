import React, { useState } from "react";

export default function ScoreboardManager({ adminView }) {
  const isPhone = adminView === "phone";

  const games = [
    { id: 1, time: "9:00 AM", team1: "Steelers", team2: "Raiders" },
    { id: 2, time: "9:00 AM", team1: "Cowboys", team2: "Eagles" },
    { id: 3, time: "10:00 AM", team1: "49ers", team2: "Packers" },
  ];

  const [selectedGame, setSelectedGame] = useState(null);

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
        width: "100%",
        height: "calc(100vh - 140px)",
        display: "flex",
        flexDirection: isPhone ? "column" : "row",
        gap: 20,
        padding: 20,
        boxSizing: "border-box",
      }}
    >
      {/* ================= LEFT PANEL ================= */}
      <div
        style={{
          flex: 2, // 👈 BIGGER for iPad
          background: "#ffffff",
          borderRadius: 16,
          padding: 25,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Score Entry</h2>

        {!selectedGame && (
          <p style={{ color: "#777", fontSize: 16 }}>
            Select a game from the right
          </p>
        )}

        {selectedGame && (
          <>
            <h2 style={{ marginBottom: 25 }}>
              {selectedGame.team1} vs {selectedGame.team2}
            </h2>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 16 }}>
                {selectedGame.team1}
              </label>
              <input
                type="number"
                style={{
                  width: "100%",
                  padding: 16,
                  marginTop: 8,
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  fontSize: 18,
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 16 }}>
                {selectedGame.team2}
              </label>
              <input
                type="number"
                style={{
                  width: "100%",
                  padding: 16,
                  marginTop: 8,
                  borderRadius: 10,
                  border: "1px solid #ccc",
                  fontSize: 18,
                }}
              />
            </div>

            <button
              style={{
                padding: "16px",
                borderRadius: 12,
                border: "none",
                background: "#2f6ea6",
                color: "#fff",
                cursor: "pointer",
                width: "100%",
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              Save Score
            </button>
          </>
        )}
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div
        style={{
          flex: 1, // 👈 SIDE PANEL (not fixed width anymore)
          background: "#ffffff",
          borderRadius: 16,
          padding: 20,
          overflowY: "auto",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h3 style={{ marginBottom: 15 }}>Games</h3>

        {groupedByTime.map((block) => (
          <div key={block.time} style={{ marginBottom: 20 }}>
            <h4 style={{ color: "#666", marginBottom: 10 }}>
              {block.time}
            </h4>

            {block.games.map((game) => {
              const isSelected = selectedGame?.id === game.id;

              return (
                <div
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  style={{
                    padding: 14,
                    marginBottom: 10,
                    borderRadius: 12,
                    background: isSelected ? "#2f6ea6" : "#f2f2f2",
                    color: isSelected ? "#fff" : "#000",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  {game.team1} vs {game.team2}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
