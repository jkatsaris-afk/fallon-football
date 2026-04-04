import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [liveGame, setLiveGame] = useState(null);

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

    const fixed = data.map((g) => ({
      ...g,
      game_date: new Date(g.game_date + "T00:00:00").toLocaleDateString(),
    }));

    setGames(fixed);
  }

  // ================= START GAME =================
  async function startGame(game) {
    setSelectedGame(game);

    // check if already exists
    const { data: existing } = await supabase
      .from("live_games")
      .select("*")
      .eq("game_id", game.id)
      .single();

    if (existing) {
      setLiveGame(existing);
      return;
    }

    const { data } = await supabase
      .from("live_games")
      .insert([
        {
          game_id: game.id,
          status: "live",
        },
      ])
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= UPDATE SCORE =================
  async function updateScore(field, value) {
    const newValue = Math.max(0, value);

    const { data } = await supabase
      .from("live_games")
      .update({ [field]: newValue })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= CLOCK =================
  useEffect(() => {
    if (!running || !liveGame) return;

    const timer = setInterval(() => {
      updateScore(
        "clock_seconds",
        liveGame.clock_seconds - 1
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [running, liveGame]);

  const formatTime = (sec) => {
    if (!sec) return "0:00";
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

      {/* ================= LEFT: LIVE SCOREBOARD ================= */}
      <div
        style={{
          flex: 2,
          background: "#ffffff",
          borderRadius: 16,
          padding: 25,
        }}
      >
        {!selectedGame && <h2>Select a Game</h2>}

        {selectedGame && liveGame && (
          <>
            <h2>
              {selectedGame.team1} vs {selectedGame.team2}
            </h2>

            {/* SCORE */}
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 20 }}>
              <ScoreBox
                name={selectedGame.team1}
                score={liveGame.score_team1}
                add={() =>
                  updateScore("score_team1", liveGame.score_team1 + 1)
                }
                sub={() =>
                  updateScore("score_team1", liveGame.score_team1 - 1)
                }
              />

              <ScoreBox
                name={selectedGame.team2}
                score={liveGame.score_team2}
                add={() =>
                  updateScore("score_team2", liveGame.score_team2 + 1)
                }
                sub={() =>
                  updateScore("score_team2", liveGame.score_team2 - 1)
                }
              />
            </div>

            {/* CLOCK */}
            <div style={{ textAlign: "center", marginTop: 30 }}>
              <h1>{formatTime(liveGame.clock_seconds)}</h1>

              <button onClick={() => setRunning(true)}>Start</button>
              <button onClick={() => setRunning(false)}>Stop</button>
            </div>

            {/* QUARTER */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <p>Quarter: {liveGame.quarter}</p>

              <button
                onClick={() =>
                  updateScore("quarter", (liveGame.quarter % 4) + 1)
                }
              >
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
            <summary>{day.date}</summary>

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
                <strong>{g.game_time}</strong>
                <br />
                {g.team1} vs {g.team2}

                <button
                  style={{ marginTop: 5 }}
                  onClick={() => startGame(g)}
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

function ScoreBox({ name, score, add, sub }) {
  return (
    <div style={{ textAlign: "center" }}>
      <h3>{name}</h3>
      <h1 style={{ fontSize: 50 }}>{score}</h1>

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={add}>+</button>
        <button onClick={sub}>−</button>
      </div>
    </div>
  );
}
