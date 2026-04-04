import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [liveGame, setLiveGame] = useState(null);

  const [openDate, setOpenDate] = useState(null);
  const [openTime, setOpenTime] = useState(null);

  const clockRef = useRef(null);

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
          clock: "24:00",
          down: 1,
          possession: "home",
          status: "live",
        },
      ])
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= SCORE (WORKING) =================
  async function updateScore(team, points) {
    if (!liveGame) return;

    const field = team === "home" ? "home_score" : "away_score";
    const newScore = Math.max(0, (liveGame[field] || 0) + points);

    const { data, error } = await supabase
      .from("live_games")
      .update({ [field]: newScore })
      .eq("id", liveGame.id)
      .select()
      .single();

    if (error) {
      console.error("Score update error:", error);
      return;
    }

    setLiveGame(data);
  }

  // ================= CLOCK =================
  function startClock() {
    if (!liveGame || clockRef.current) return;

    clockRef.current = setInterval(() => {
      setLiveGame((prev) => {
        if (!prev) return prev;

        let [m, s] = prev.clock.split(":").map(Number);

        if (m === 0 && s === 0) return prev;

        if (s === 0) {
          m--;
          s = 59;
        } else {
          s--;
        }

        const newTime = `${m}:${s.toString().padStart(2, "0")}`;

        supabase
          .from("live_games")
          .update({ clock: newTime })
          .eq("id", prev.id);

        return { ...prev, clock: newTime };
      });
    }, 1000);
  }

  function stopClock() {
    clearInterval(clockRef.current);
    clockRef.current = null;
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

      {/* LEFT PANEL */}
      <div style={leftPanel}>

        {!selectedGame && (
          <div style={empty}>
            <h2>No Game Active</h2>
            <p>Select and start a game</p>
          </div>
        )}

        {selectedGame && (
          <>
            <h2 style={{ textAlign: "center" }}>
              {selectedGame.team1} vs {selectedGame.team2}
            </h2>

            <div style={board}>

              {/* HOME */}
              <div style={team}>
                <h3>{selectedGame.team1}</h3>
                <div style={score}>{liveGame?.home_score ?? 0}</div>

                <div style={btnRow}>
                  <button onClick={() => updateScore("home", 6)}>TD</button>
                  <button onClick={() => updateScore("home", 2)}>XP1</button>
                  <button onClick={() => updateScore("home", 1)}>XP2</button>
                  <button onClick={() => updateScore("home", -1)}>-</button>
                </div>
              </div>

              {/* CENTER */}
              <div style={center}>
                <div style={clock}>{liveGame?.clock ?? "24:00"}</div>
                <div>Half {liveGame?.quarter ?? 1}</div>

                <div style={btnRow}>
                  <button onClick={startClock}>Start</button>
                  <button onClick={stopClock}>Stop</button>
                </div>
              </div>

              {/* AWAY */}
              <div style={team}>
                <h3>{selectedGame.team2}</h3>
                <div style={score}>{liveGame?.away_score ?? 0}</div>

                <div style={btnRow}>
                  <button onClick={() => updateScore("away", 6)}>TD</button>
                  <button onClick={() => updateScore("away", 2)}>XP1</button>
                  <button onClick={() => updateScore("away", 1)}>XP2</button>
                  <button onClick={() => updateScore("away", -1)}>-</button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={rightPanel}>
        {grouped.map((day) => (
          <div key={day.date}>
            <div className="card" onClick={() => setOpenDate(day.date)}>
              {day.date}
            </div>

            {openDate === day.date &&
              Object.entries(day.times).map(([time, games]) => (
                <div key={time}>
                  <div className="card" onClick={() => setOpenTime(time)}>
                    {time}
                  </div>

                  {openTime === time &&
                    games.map((g) => (
                      <div key={g.id} className="inner-tile">
                        {g.team1} vs {g.team2}
                        <button onClick={() => startGame(g)}>
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

// ===== STYLES =====
const leftPanel = { flex: 2, background: "#fff", padding: 20, borderRadius: 12 };
const rightPanel = { flex: 1, overflowY: "auto" };
const empty = { textAlign: "center", marginTop: "30%" };

const board = {
  display: "flex",
  justifyContent: "space-between",
  background: "#f1f5f9",
  padding: 20,
  borderRadius: 16,
};

const team = { textAlign: "center", flex: 1 };
const center = { textAlign: "center", flex: 1 };

const score = { fontSize: 48, fontWeight: "bold" };
const clock = { fontSize: 36 };

const btnRow = {
  display: "flex",
  gap: 6,
  justifyContent: "center",
  marginTop: 10,
};
