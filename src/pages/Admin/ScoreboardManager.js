import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  const [score, setScore] = useState({ t1: 0, t2: 0 });
  const [quarter, setQuarter] = useState(1);
  const [clock, setClock] = useState(600); // 10 min
  const [running, setRunning] = useState(false);

  // ================= LOAD GAMES =================
  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data } = await supabase
      .from("games")
      .select("*")
      .order("game_date")
      .order("game_time");

    // FIX DATE OFFSET
    const fixed = data.map((g) => ({
      ...g,
      game_date: new Date(g.game_date + "T00:00:00").toLocaleDateString(),
    }));

    setGames(fixed);
  }

  // ================= CLOCK =================
  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setClock((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ================= GROUP =================
  const grouped = Object.values(
    games.reduce((acc, g) => {
      if (!acc[g.game_date]) {
        acc[g.game_date] = { date: g.game_date, games: [] };
      }
      acc[g.game_date].games.push(g);
      return acc;
    }, {})
  );

  return (
    <div style={{ display: "flex", gap: 20, height: "100%" }}>

      {/* ================= LEFT: SCOREBOARD ================= */}
      <div
        style={{
          flex: 2,
          background: "#ffffff",
          borderRadius: 16,
          padding: 25,
        }}
      >
        {!selectedGame && <h2>Select a Game</h2>}

        {selectedGame && (
          <>
            <h2>
              {selectedGame.team1} vs {selectedGame.team2}
            </h2>

            {/* SCORE DISPLAY */}
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 20 }}>
              <ScoreBox
                name={selectedGame.team1}
                score={score.t1}
                onAdd={() => setScore({ ...score, t1: score.t1 + 1 })}
                onSub={() => setScore({ ...score, t1: Math.max(0, score.t1 - 1) })}
              />

              <ScoreBox
                name={selectedGame.team2}
                score={score.t2}
                onAdd={() => setScore({ ...score, t2: score.t2 + 1 })}
                onSub={() => setScore({ ...score, t2: Math.max(0, score.t2 - 1) })}
              />
            </div>

            {/* CLOCK */}
            <div style={{ textAlign: "center", marginTop: 30 }}>
              <h1>{formatTime(clock)}</h1>

              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setRunning(true)}>Start</button>
                <button onClick={() => setRunning(false)}>Stop</button>
                <button onClick={() => setClock(600)}>Reset</button>
              </div>
            </div>

            {/* QUARTER */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <p>Quarter: {quarter}</p>
              <button onClick={() => setQuarter((q) => (q % 4) + 1)}>
                Next Quarter
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
          <details key={day.date} open>
            <summary style={{ fontWeight: "bold", marginBottom: 10 }}>
              {day.date}
            </summary>

            {day.games.map((g) => (
              <div
                key={g.id}
                style={{
                  padding: 10,
                  marginBottom: 10,
                  background: "#f1f5f9",
                  borderRadius: 8,
                }}
              >
                <div>
                  <strong>{g.game_time}</strong>
                  <br />
                  {g.team1} vs {g.team2}
                </div>

                <button
                  style={{ marginTop: 5 }}
                  onClick={() => {
                    setSelectedGame(g);
                    setScore({ t1: 0, t2: 0 });
                    setClock(600);
                    setQuarter(1);
                  }}
                >
                  Start Game
                </button>
              </div>
            ))}
          </details>
        ))}
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */

function ScoreBox({ name, score, onAdd, onSub }) {
  return (
    <div style={{ textAlign: "center" }}>
      <h3>{name}</h3>
      <h1 style={{ fontSize: 50 }}>{score}</h1>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={onAdd}>+</button>
        <button onClick={onSub}>−</button>
      </div>
    </div>
  );
}
