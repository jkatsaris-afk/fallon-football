import React, { useState } from "react";

export default function ScoreboardManager({ adminView, setPage }) {
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
    <div style={{ display: "flex", height: "100%", background: "#f8fafc" }}>

      {/* ================= SIDEBAR ================= */}
      <div
        style={{
          width: 220,
          background: "#ffffff",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 15,
          borderRight: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Admin</h2>

        <button style={navBtn()} onClick={() => setPage("dashboard")}>
          Dashboard
        </button>

        <button style={navBtn(true)}>
          Scoreboard Manager
        </button>

        <button style={navBtn()}>Schedule</button>
        <button style={navBtn()}>Teams</button>
        <button style={navBtn()}>Reports</button>
      </div>

      {/* ================= MAIN ================= */}
      <div style={{ flex: 1, padding: 25, display: "flex", gap: 20 }}>

        {/* LEFT: SCORE ENTRY */}
        <div
          style={{
            flex: 2,
            background: "#ffffff",
            borderRadius: 16,
            padding: 25,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
        >
          <h2 style={{ marginBottom: 20 }}>Score Entry</h2>

          {!selectedGame && (
            <p style={{ color: "#64748b" }}>
              Select a game from the right
            </p>
          )}

          {selectedGame && (
            <>
              <h2 style={{ marginBottom: 25 }}>
                {selectedGame.team1} vs {selectedGame.team2}
              </h2>

              <div style={{ marginBottom: 20 }}>
                <label>{selectedGame.team1}</label>
                <input
                  type="number"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label>{selectedGame.team2}</label>
                <input
                  type="number"
                  style={inputStyle}
                />
              </div>

              <button style={saveBtn}>
                Save Score
              </button>
            </>
          )}
        </div>

        {/* RIGHT: GAME LIST */}
        <div
          style={{
            flex: 1,
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            overflowY: "auto",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ marginBottom: 15 }}>Games</h3>

          {groupedByTime.map((block) => (
            <div key={block.time} style={{ marginBottom: 20 }}>
              <h4 style={{ color: "#64748b", marginBottom: 10 }}>
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
                      marginBottom: 10,
                      borderRadius: 10,
                      background: isSelected ? "#2f6ea6" : "#f1f5f9",
                      color: isSelected ? "#fff" : "#0f172a",
                      cursor: "pointer",
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
    </div>
  );
}

/* ================= STYLES ================= */

function navBtn(active = false) {
  return {
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: active ? "#2f6ea6" : "transparent",
    color: active ? "#fff" : "#0f172a",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: active ? "600" : "500",
  };
}

const inputStyle = {
  width: "100%",
  padding: 14,
  marginTop: 6,
  borderRadius: 8,
  border: "1px solid #d1d5db",
};

const saveBtn = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  fontSize: 16,
  cursor: "pointer",
};
