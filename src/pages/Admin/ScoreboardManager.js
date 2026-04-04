import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [liveGame, setLiveGame] = useState(null);

  const [openDate, setOpenDate] = useState(null);
  const [openTime, setOpenTime] = useState(null);

  let clockInterval;

  // ================= LOAD =================
  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date")
      .order("event_time");

    const mapped = data
      .filter((g) =>
        (g.event_type || "").toLowerCase().includes("game")
      )
      .map((g) => ({
        ...g,
        display_date: new Date(g.event_date + "T00:00:00")
          .toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
          }),
        display_time: g.event_time,
        team1: g.team,
        team2: g.opponent,
        field: g.field,
      }));

    setGames(mapped);
  }

  // ================= START GAME =================
  async function startGame(game) {
    setSelectedGame(game);

    const { data: existing } = await supabase
      .from("live_games")
      .select("*")
      .eq("game_id", game.id)
      .maybeSingle();

    if (existing) {
      setLiveGame(existing);
      return;
    }

    const { data } = await supabase
      .from("live_games")
      .insert([
        {
          game_id: game.id,
          home_score: 0,
          away_score: 0,
          quarter: 1,
          clock: "20:00",
          down: 1,
          possession: "home",
          status: "live",
        },
      ])
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= SCORE =================
  async function updateScore(points, team) {
    if (!liveGame) return;

    const field = team === "home" ? "home_score" : "away_score";
    const newScore = Math.max(0, (liveGame[field] || 0) + points);

    const { data } = await supabase
      .from("live_games")
      .update({ [field]: newScore })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= CLOCK =================
  function startClock() {
    if (!liveGame) return;

    clockInterval = setInterval(async () => {
      let [min, sec] = (liveGame.clock || "20:00")
        .split(":")
        .map(Number);

      if (sec === 0) {
        if (min === 0) return;
        min--;
        sec = 59;
      } else {
        sec--;
      }

      const newTime = `${min}:${sec.toString().padStart(2, "0")}`;

      const { data } = await supabase
        .from("live_games")
        .update({ clock: newTime })
        .eq("id", liveGame.id)
        .select()
        .single();

      setLiveGame(data);
    }, 1000);
  }

  function stopClock() {
    clearInterval(clockInterval);
  }

  // ================= GROUP =================
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

      {/* ================= LEFT PANEL ================= */}
      <div style={{ flex: 2, background: "#fff", padding: 20, borderRadius: 12 }}>

        {!selectedGame && <h2>Select a Game</h2>}

        {selectedGame && (
          <>
            <h2 style={{ textAlign: "center" }}>
              {selectedGame.team1} vs {selectedGame.team2}
            </h2>

            {/* SCOREBOARD */}
            <div
              style={{
                marginTop: 10,
                padding: 20,
                borderRadius: 16,
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >

                {/* TEAM 1 */}
                <div style={{ textAlign: "center" }}>
                  <h3>{selectedGame.team1}</h3>
                  <h1>{liveGame?.home_score ?? 0}</h1>

                  <div style={btnRow}>
                    <button style={btnPrimary} onClick={() => updateScore(1, "home")}>+1</button>
                    <button style={btnPrimary} onClick={() => updateScore(2, "home")}>+2</button>
                    <button style={btnPrimary} onClick={() => updateScore(6, "home")}>+6</button>
                    <button style={btnDanger} onClick={() => updateScore(-1, "home")}>-</button>
                  </div>
                </div>

                {/* CLOCK */}
                <div style={{ textAlign: "center" }}>
                  <h1>{liveGame?.clock ?? "20:00"}</h1>
                  <div>Q{liveGame?.quarter ?? 1}</div>
                  <div>Down {liveGame?.down ?? 1}</div>
                </div>

                {/* TEAM 2 */}
                <div style={{ textAlign: "center" }}>
                  <h3>{selectedGame.team2}</h3>
                  <h1>{liveGame?.away_score ?? 0}</h1>

                  <div style={btnRow}>
                    <button style={btnPrimary} onClick={() => updateScore(1, "away")}>+1</button>
                    <button style={btnPrimary} onClick={() => updateScore(2, "away")}>+2</button>
                    <button style={btnPrimary} onClick={() => updateScore(6, "away")}>+6</button>
                    <button style={btnDanger} onClick={() => updateScore(-1, "away")}>-</button>
                  </div>
                </div>

              </div>
            </div>

            {/* CLOCK CONTROLS */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button style={btnPrimary} onClick={startClock}>Start Clock</button>
              <button style={btnSecondary} onClick={stopClock}>Stop Clock</button>
            </div>

          </>
        )}
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        <h3>Games</h3>

        {grouped.map((day) => (
          <div key={day.date}>

            <div
              className={`card ${openDate === day.date ? "active-card" : ""}`}
              onClick={() => {
                setOpenDate(openDate === day.date ? null : day.date);
                setOpenTime(null);
              }}
            >
              <div className="title">{day.date}</div>
            </div>

            {openDate === day.date &&
              Object.entries(day.times).map(([time, gamesAtTime]) => (
                <div key={time}>

                  <div
                    className="card"
                    style={{ background: "#e8f5e9" }}
                    onClick={() =>
                      setOpenTime(openTime === time ? null : time)
                    }
                  >
                    <div className="title">{time}</div>
                  </div>

                  {openTime === time &&
                    gamesAtTime.map((g) => (
                      <div key={g.id} className="inner-tile">

                        <div className="game-row">
                          <div className="team">{g.team1}</div>
                          <div className="vs">vs</div>
                          <div className="team">{g.team2}</div>
                        </div>

                        <button
                          style={startBtn}
                          onClick={() => startGame(g)}
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

// ================= STYLES =================
const btnRow = {
  display: "flex",
  gap: 6,
  marginTop: 8,
};

const btnPrimary = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  cursor: "pointer",
};

const btnSecondary = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
  background: "#fff",
};

const btnDanger = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "none",
  background: "#dc2626",
  color: "#fff",
};

const startBtn = {
  marginTop: 10,
  width: "100%",
  padding: "10px",
  borderRadius: 8,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
};
