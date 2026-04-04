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

    // Try to load existing
    const { data: existing } = await supabase
      .from("live_games")
      .select("*")
      .eq("game_id", game.id)
      .maybeSingle();

    if (existing) {
      setLiveGame(existing);
      return;
    }

    // Create new safe default
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

            {/* ✅ SAFE FALLBACK SCOREBOARD */}
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
          </>
        )}
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        <h3 style={{ marginBottom: 10 }}>Games</h3>

        {grouped.map((day) => (
          <div key={day.date}>

            {/* DATE */}
            <div
              className={`card ${
                openDate === day.date ? "active-card" : ""
              }`}
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

                  {/* TIME */}
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

                  {/* GAMES */}
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

                        {/* ✅ FIXED BUTTON */}
                        <button
                          style={{
                            marginTop: 10,
                            width: "100%",
                            padding: "10px",
                            borderRadius: 8,
                            border: "none",
                            background: "#2f6ea6",
                            color: "#fff",
                            cursor: "pointer",
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
