import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [liveGame, setLiveGame] = useState(null);

  const [openDate, setOpenDate] = useState(null);
  const [openTime, setOpenTime] = useState(null);

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
  async function updateScore(points) {
    if (!liveGame) return;

    const field =
      liveGame.possession === "home"
        ? "home_score"
        : "away_score";

    const newScore = Math.max(0, (liveGame[field] || 0) + points);

    const { data } = await supabase
      .from("live_games")
      .update({ [field]: newScore })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  async function updateDown(down) {
    if (!liveGame) return;

    const { data } = await supabase
      .from("live_games")
      .update({ down })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  async function togglePossession() {
    if (!liveGame) return;

    const newPos =
      liveGame.possession === "home" ? "away" : "home";

    const { data } = await supabase
      .from("live_games")
      .update({ possession: newPos })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  async function nextQuarter() {
    if (!liveGame) return;

    const { data } = await supabase
      .from("live_games")
      .update({ quarter: (liveGame.quarter || 1) + 1 })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
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
      <div
        style={{
          flex: 2,
          background: "#ffffff",
          borderRadius: 16,
          padding: 20,
        }}
      >
        {!selectedGame && <h2>Select a Game</h2>}

        {selectedGame && (
          <>
            <h2>
              {selectedGame.team1} vs {selectedGame.team2}
            </h2>

            <p style={{ color: "#64748b" }}>
              {selectedGame.display_time} • {selectedGame.field}
            </p>

            {/* SCOREBOARD */}
            <div
              style={{
                marginTop: 20,
                padding: 20,
                borderRadius: 12,
                background: "#f8fafc",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3>{selectedGame.team1}</h3>
                <h1>{liveGame?.home_score ?? 0}</h1>
              </div>

              <div style={{ textAlign: "center" }}>
                <div>Q{liveGame?.quarter ?? 1}</div>
                <div>{liveGame?.clock ?? "20:00"}</div>
                <div>Down {liveGame?.down ?? 1}</div>
              </div>

              <div>
                <h3>{selectedGame.team2}</h3>
                <h1>{liveGame?.away_score ?? 0}</h1>
              </div>
            </div>

            {/* CONTROLS */}
            {liveGame && (
              <div style={{ marginTop: 20 }}>

                {/* SCORING */}
                <div style={btnRow}>
                  <button style={btnPrimary} onClick={() => updateScore(6)}>+6 TD</button>
                  <button style={btnPrimary} onClick={() => updateScore(1)}>+1</button>
                  <button style={btnPrimary} onClick={() => updateScore(2)}>+2</button>
                  <button style={btnDanger} onClick={() => updateScore(-1)}>-</button>
                </div>

                {/* DOWNS */}
                <div style={btnRow}>
                  <button style={btnSecondary} onClick={() => updateDown(1)}>1st</button>
                  <button style={btnSecondary} onClick={() => updateDown(2)}>2nd</button>
                  <button style={btnSecondary} onClick={() => updateDown(3)}>3rd</button>
                  <button style={btnSecondary} onClick={() => updateDown(4)}>4th</button>
                </div>

                {/* POSSESSION */}
                <div style={btnRow}>
                  <button style={btnPrimary} onClick={togglePossession}>
                    Possession: {liveGame.possession}
                  </button>
                </div>

                {/* QUARTER */}
                <div style={btnRow}>
                  <button style={btnSecondary} onClick={nextQuarter}>
                    Next Quarter
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        <h3 style={{ marginBottom: 10 }}>Games</h3>

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
                    style={{
                      background: "#e8f5e9",
                      border:
                        openTime === time
                          ? "2px solid #2e7d32"
                          : "1px solid #e5e7eb",
                    }}
                    onClick={() =>
                      setOpenTime(openTime === time ? null : time)
                    }
                  >
                    <div className="title">{time}</div>
                  </div>

                  {openTime === time &&
                    gamesAtTime.map((g) => (
                      <div key={g.id} className="inner-tile">

                        <div
                          className="game-row"
                          onClick={() => setSelectedGame(g)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="team">{g.team1}</div>
                          <div className="vs">vs</div>
                          <div className="team">{g.team2}</div>
                        </div>

                        <button
                          style={{
                            marginTop: 10,
                            width: "100%",
                            padding: "10px",
                            borderRadius: 8,
                            border: "none",
                            background: "#2f6ea6",
                            color: "#fff",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            startGame(g);
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

// ================= STYLES =================
const btnRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 10,
};

const btnPrimary = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  cursor: "pointer",
};

const btnSecondary = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};

const btnDanger = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  cursor: "pointer",
};
