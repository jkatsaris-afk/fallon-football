import React, { useState } from "react";

export default function ScoreboardManager() {
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
    <div style={{ display: "flex", gap: 20, height: "100%" }}>

      {/* LEFT PANEL */}
      <div
        style={{
          flex: 2,
          background: "#ffffff",
          borderRadius: 16,
          padding: 25,
        }}
      >
        <h2>Score Entry</h2>

        {!selectedGame && <p>Select a game</p>}

        {selectedGame && (
          <>
            <h3>
              {selectedGame.team1} vs {selectedGame.team2}
            </h3>

            <input type="number" placeholder="Team 1" style={input} />
            <input type="number" placeholder="Team 2" style={input} />

            <button style={btn}>Save</button>
          </>
        )}
      </div>

      {/* RIGHT PANEL */}
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

        {groupedByTime.map((block) => (
          <div key={block.time}>
            <h4>{block.time}</h4>

            {block.games.map((game) => (
              <div
                key={game.id}
                onClick={() => setSelectedGame(game)}
                style={{
                  padding: 10,
                  marginBottom: 8,
                  background: "#f1f5f9",
                  borderRadius: 8,
                  cursor: "pointer",
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

const input = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const btn = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
};
