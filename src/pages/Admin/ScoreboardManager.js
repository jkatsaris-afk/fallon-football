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
          quarter: 1, // = HALF
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
    if (!liveGame || clockRef.current) return;

    clockRef.current = setInterval(async () => {
      setLiveGame((prev) => {
        if (!prev) return prev;

        let [min, sec] = prev.clock.split(":").map(Number);

        if (min === 0 && sec === 0) return prev;

        if (sec === 0) {
          min--;
          sec = 59;
        } else {
          sec--;
        }

        const newTime = `${min}:${sec.toString().padStart(2, "0")}`;

        // push to DB async
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

  async function nextHalf() {
    if (!liveGame) return;

    stopClock();

    const { data } = await supabase
      .from("live_games")
      .update({
        quarter: liveGame.quarter + 1,
        clock: "24:00",
      })
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

      {/* ================= LEFT ================= */}
      <div style={{ flex: 2, background: "#fff", padding: 20, borderRadius: 12 }}>

        {!selectedGame && (
          <div style={empty}>
            <div>
              <h2>No Game Active</h2>
              <p>Select and start a game</p>
            </div>
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
                <h1>{liveGame?.home_score ?? 0}</h1>

                <div style={row}>
                  <button onClick={() => updateScore(1, "home")}>+1</button>
                  <button onClick={() => updateScore(-1, "home")}>-1</button>
                </div>

                <div style={row}>
                  <button onClick={() => updateScore(6, "home")}>TD</button>
                  <button onClick={() => updateScore(1, "home")}>XP1</button>
                  <button onClick={() => updateScore(2, "home")}>XP2</button>
                  <button onClick={() => updateScore(2, "home")}>Safety</button>
                </div>
              </div>

              {/* CENTER */}
              <div style={center}>
                <h1>{liveGame?.clock ?? "24:00"}</h1>
                <div>Half {liveGame?.quarter ?? 1}</div>

                <div style={row}>
                  <button onClick={startClock}>Start</button>
                  <button onClick={stopClock}>Stop</button>
                  <button onClick={nextHalf}>Next Half</button>
                </div>
              </div>

              {/* AWAY */}
              <div style={team}>
                <h3>{selectedGame.team2}</h3>
                <h1>{liveGame?.away_score ?? 0}</h1>

                <div style={row}>
                  <button onClick={() => updateScore(1, "away")}>+1</button>
                  <button onClick={() => updateScore(-1, "away")}>-1</button>
                </div>

                <div style={row}>
                  <button onClick={() => updateScore(6, "away")}>TD</button>
                  <button onClick={() => updateScore(1, "away")}>XP1</button>
                  <button onClick={() => updateScore(2, "away")}>XP2</button>
                  <button onClick={() => updateScore(2, "away")}>Safety</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ================= RIGHT ================= */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {grouped.map((day) => (
          <div key={day.date}>
            <div className="card" onClick={() => setOpenDate(day.date)}>
              {day.date}
            </div>

            {openDate === day.date &&
              Object.entries(day.times).map(([time, games]) => (
                <div key={time}>
                  <div className="card" style={{ background: "#e8f5e9" }}
                       onClick={() => setOpenTime(time)}>
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
const empty = {
  height: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  color: "#64748b",
};

const board = {
  display: "flex",
  justifyContent: "space-between",
  background: "#f8fafc",
  padding: 20,
  borderRadius: 12,
};

const team = { textAlign: "center", flex: 1 };
const center = { textAlign: "center", flex: 1 };

const row = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
  marginTop: 10,
};
