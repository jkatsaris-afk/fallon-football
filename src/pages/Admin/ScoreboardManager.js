import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [liveGame, setLiveGame] = useState(null);

  // ================= LOAD GAMES =================
  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const mapped = data.map((g) => ({
      ...g,

      // FIX DATE OFFSET
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
      .insert([{ game_id: game.id, status: "live" }])
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= GROUP DATE → TIME =================
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

            {liveGame && (
              <div style={{ marginTop: 20 }}>
                <p>Status: {liveGame.status}</p>
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

            {/* DATE HEADER */}
            <div className="card active-card">
              <div className="title">{day.date}</div>
            </div>

            {Object.entries(day.times).map(([time, gamesAtTime]) => (
              <div key={time}>

                {/* TIME HEADER */}
                <div className="card">
                  <div className="title">{time}</div>
                </div>

                {/* GAMES */}
                {gamesAtTime.map((g, i) => (
                  <div key={g.id}>

                    {i !== 0 && <div className="divider" />}

                    <div className="inner-tile">

                      <div
                        className="game-row"
                        onClick={() => setSelectedGame(g)}
                        style={{ cursor: "pointer" }}
                      >

                        {/* TOP TEAM */}
                        <div className="game-top">
                          <div className="team">{g.team1}</div>
                          <div className="game-time">{g.display_time}</div>
                        </div>

                        <div className="vs">vs</div>

                        {/* BOTTOM TEAM */}
                        <div className="game-bottom">
                          <div className="team">{g.team2}</div>
                          <div className="field-badge">{g.field}</div>
                        </div>

                      </div>

                      {/* START BUTTON */}
                      <div style={{ marginTop: 10 }}>
                        <button
                          style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: 8,
                            border: "none",
                            background: "#2f6ea6",
                            color: "#fff",
                            fontWeight: "600",
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

                    </div>

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
