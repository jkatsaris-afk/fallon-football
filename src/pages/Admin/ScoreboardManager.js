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
      .insert([{ game_id: game.id }])
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= SCORE =================
  async function updateScore(points) {
    const field =
      liveGame.possession === "home"
        ? "home_score"
        : "away_score";

    const newScore = liveGame[field] + points;

    const { data } = await supabase
      .from("live_games")
      .update({ [field]: newScore })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  async function updateDown(down) {
    const { data } = await supabase
      .from("live_games")
      .update({ down })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  async function togglePossession() {
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

  // ================= CLOCK =================
  function startClock() {
    clockInterval = setInterval(async () => {
      let [min, sec] = liveGame.clock.split(":").map(Number);

      if (sec === 0) {
        if (min === 0) return;
        min--;
        sec = 59;
      } else {
        sec--;
      }

      const newTime = `${min}:${sec
        .toString()
        .padStart(2, "0")}`;

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

  async function nextQuarter() {
    const { data } = await supabase
      .from("live_games")
      .update({ quarter: liveGame.quarter + 1 })
      .eq("id", liveGame.id)
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= END GAME =================
  async function endGame() {
    const winner =
      liveGame.home_score > liveGame.away_score
        ? selectedGame.team1
        : selectedGame.team2;

    const loser =
      liveGame.home_score > liveGame.away_score
        ? selectedGame.team2
        : selectedGame.team1;

    await supabase
      .from("team_records")
      .update({ wins: 1 })
      .eq("team_name", winner);

    await supabase
      .from("team_records")
      .update({ losses: 1 })
      .eq("team_name", loser);

    await supabase
      .from("live_games")
      .update({ status: "final" })
      .eq("id", liveGame.id);

    alert("Game Final");
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

        {selectedGame && liveGame && (
          <>
            {/* SCOREBOARD */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <h2>{selectedGame.team1}</h2>
                <h1>{liveGame.home_score}</h1>
              </div>

              <div style={{ textAlign: "center" }}>
                <div>Q{liveGame.quarter}</div>
                <div>{liveGame.clock}</div>
                <div>Down {liveGame.down}</div>
              </div>

              <div>
                <h2>{selectedGame.team2}</h2>
                <h1>{liveGame.away_score}</h1>
              </div>
            </div>

            {/* CONTROLS */}
            <div style={{ marginTop: 20 }}>
              <button onClick={() => updateScore(6)}>+6 TD</button>
              <button onClick={() => updateScore(1)}>+1</button>
              <button onClick={() => updateScore(2)}>+2</button>
              <button onClick={() => updateScore(-1)}>-</button>

              <div style={{ marginTop: 10 }}>
                <button onClick={() => updateDown(1)}>1st</button>
                <button onClick={() => updateDown(2)}>2nd</button>
                <button onClick={() => updateDown(3)}>3rd</button>
                <button onClick={() => updateDown(4)}>4th</button>
              </div>

              <div style={{ marginTop: 10 }}>
                <button onClick={togglePossession}>
                  Possession: {liveGame.possession}
                </button>
              </div>

              <div style={{ marginTop: 10 }}>
                <button onClick={startClock}>Start</button>
                <button onClick={stopClock}>Stop</button>
                <button onClick={nextQuarter}>Next Q</button>
              </div>

              <button
                style={{ marginTop: 20, background: "red", color: "#fff" }}
                onClick={endGame}
              >
                End Game
              </button>
            </div>
          </>
        )}
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {grouped.map((day) => (
          <div key={day.date}>
            <div className="card" onClick={() => setOpenDate(day.date)}>
              <div className="title">{day.date}</div>
            </div>

            {openDate === day.date &&
              Object.entries(day.times).map(([time, gamesAtTime]) => (
                <div key={time}>

                  <div
                    className="card"
                    style={{ background: "#e8f5e9" }}
                    onClick={() => setOpenTime(time)}
                  >
                    <div className="title">{time}</div>
                  </div>

                  {openTime === time &&
                    gamesAtTime.map((g) => (
                      <div key={g.id} className="inner-tile">
                        <div onClick={() => setSelectedGame(g)}>
                          {g.team1} vs {g.team2}
                        </div>

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
