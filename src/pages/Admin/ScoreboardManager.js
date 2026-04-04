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
        display: "flex",
        flexDirection: isPhone ? "column" : "row",
        height: "calc(100vh - 140px)",
        gap: 10,
        padding: 10,
      }}
    >
      {/* ================= LEFT SIDE ================= */}
      <div
        style={{
          flex: 1,
          background: "#ffffff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h2 style={{ marginBottom: 15 }}>Score Entry</h2>

        {!selectedGame && (
          <p style={{ color: "#777" }}>
            Select a game from the right
          </p>
        )}

        {selectedGame && (
          <>
            <h3 style={{ marginBottom: 20 }}>
              {selectedGame.team1} vs {selectedGame.team2}
            </h3>

            <div style={{ marginBottom: 15 }}>
              <label>{selectedGame.team1}</label>
              <input
                type="number"
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 5,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label>{selectedGame.team2}</label>
              <input
                type="number"
                style={{
                  width: "100%",
                  padding: 12,
                  marginTop: 5,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <button
              style={{
                padding: "12px 20px",
                borderRadius: 10,
                border: "none",
                background: "#2f6ea6",
                color: "#fff",
                cursor: "pointer",
                width: "100%",
                fontSize: 16,
              }}
            >
              Save Score
            </button>
          </>
        )}
      </div>

      {/* ================= RIGHT SIDE ================= */}
      <div
        style={{
          width: isPhone ? "100%" : 320,
          background: "#ffffff",
          borderRadius: 12,
          padding: 15,
          overflowY: "auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginBottom: 10 }}>Games</h3>

        {groupedByTime.map((block) => (
          <div key={block.time} style={{ marginBottom: 15 }}>
            <h4 style={{ color: "#555", marginBottom: 8 }}>
              {block.time}
            </h4>

            {block.games.map((game) => {
              const isSelected = selectedGame?.id === game.id;

              return (
                <div
                  key={game.id}
                  onClick={() => setSelectedGame(game)}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 10,
                    background: isSelected ? "#2f6ea6" : "#f5f5f5",
                    color: isSelected ? "#fff" : "#000",
                    cursor: "pointer",
                    transition: "0.2s",
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
