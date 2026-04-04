import React, { useState } from "react";

export default function ScoreboardManager() {
  const games = [
    {
      id: 1,
      date: "Apr 10",
      time: "9:00 AM",
      team1: "Steelers",
      team2: "Raiders",
    },
    {
      id: 2,
      date: "Apr 10",
      time: "10:00 AM",
      team1: "Cowboys",
      team2: "Eagles",
    },
    {
      id: 3,
      date: "Apr 11",
      time: "9:00 AM",
      team1: "49ers",
      team2: "Packers",
    },
  ];

  const [selectedGame, setSelectedGame] = useState(null);
  const [score, setScore] = useState({ t1: 0, t2: 0 });
  const [down, setDown] = useState(1);
  const [quarter, setQuarter] = useState(1);
  const [possession, setPossession] = useState("t1");

  // GROUP BY DATE → TIME
  const grouped = Object.values(
    games.reduce((acc, game) => {
      if (!acc[game.date]) {
        acc[game.date] = { date: game.date, games: [] };
      }
      acc[game.date].games.push(game);
      return acc;
    }, {})
  );

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>

      {/* ================= LEFT: LIVE SCOREBOARD ================= */}
      <div
        style={{
          flex: 2,
          background: "#0f172a",
          color: "#fff",
          borderRadius: 16,
          padding: 25,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {!selectedGame && (
          <div style={{ textAlign: "center", marginTop: 100 }}>
            <h2>Select a Game</h2>
          </div>
        )}

        {selectedGame && (
          <>
            {/* TEAMS + SCORE */}
            <div style={{ textAlign: "center" }}>
              <h2>{selectedGame.team1}</h2>
              <h1 style={{ fontSize: 60 }}>{score.t1}</h1>

              <h2 style={{ marginTop: 20 }}>{selectedGame.team2}</h2>
              <h1 style={{ fontSize: 60 }}>{score.t2}</h1>
            </div>

            {/* GAME INFO */}
            <div style={{ textAlign: "center" }}>
              <p>Down: {down}</p>
              <p>Quarter: {quarter}</p>
              <p>
                Possession:{" "}
                {possession === "t1"
                  ? selectedGame.team1
                  : selectedGame.team2}
              </p>
            </div>

            {/* CONTROLS */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={() => setScore({ ...score, t1: score.t1 + 1 })}>+1 T1</button>
              <button onClick={() => setScore({ ...score, t1: score.t1 + 2 })}>+2 T1</button>
              <button onClick={() => setScore({ ...score, t1: score.t1 + 6 })}>+6 T1</button>

              <button onClick={() => setScore({ ...score, t2: score.t2 + 1 })}>+1 T2</button>
              <button onClick={() => setScore({ ...score, t2: score.t2 + 2 })}>+2 T2</button>
              <button onClick={() => setScore({ ...score, t2: score.t2 + 6 })}>+6 T2</button>

              <button onClick={() => setDown((d) => (d % 4) + 1)}>Next Down</button>
              <button onClick={() => setQuarter((q) => (q % 4) + 1)}>Next Quarter</button>

              <button
                onClick={() =>
                  setPossession(possession === "t1" ? "t2" : "t1")
                }
              >
                Change Possession
              </button>
            </div>
          </>
        )}
      </div>

      {/* ================= RIGHT: GAME LIST ================= */}
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
            <h4 style={{ color: "#64748b" }}>{day.date}</h4>

            {day.games.map((game) => {
              const isSelected = selectedGame?.id === game.id;

              return (
                <div
                  key={game.id}
                  onClick={() => {
                    setSelectedGame(game);
                    setScore({ t1: 0, t2: 0 });
                    setDown(1);
                    setQuarter(1);
                  }}
                  style={{
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 10,
                    background: isSelected ? "#2f6ea6" : "#f1f5f9",
                    color: isSelected ? "#fff" : "#000",
                    cursor: "pointer",
                  }}
                >
                  <strong>{game.time}</strong>
                  <br />
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
