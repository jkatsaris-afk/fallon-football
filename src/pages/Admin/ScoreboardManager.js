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
          clock: "24:00", // ✅ FIXED
          down: 1,
          possession: "home",
          status: "live",
        },
      ])
      .select()
      .single();

    setLiveGame(data);
  }

  // ================= SCORE (FIXED) =================
  async function updateScore(points, team) {
    if (!liveGame) {
      console.log("No live game");
      return;
    }

    try {
      const field = team === "home" ? "home_score" : "away_score";

      const currentScore = liveGame[field] || 0;
      const newScore = Math.max(0, currentScore + points);

      console.log("Updating:", field, newScore);

      const { data, error } = await supabase
        .from("live_games")
        .update({ [field]: newScore })
        .eq("id", liveGame.id)
        .select()
        .single();

      if (error) {
        console.error("DB ERROR:", error);
        return;
      }

      setLiveGame(data);
    } catch (err) {
      console.error("Update failed:", err);
    }
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

  // ================= CLOCK =================
  function startClock() {
    if (!liveGame) return;

    clockInterval = setInterval(async () => {
      let [min, sec] = (liveGame.clock || "24:00")
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

      {/* LEFT PANEL */}
      <div style={{ flex: 2, background: "#fff", padding: 20, borderRadius: 12 }}>

        {!selectedGame && <h2>Select a Game</h2>}

        {selectedGame && (
          <div>

            <h2 style={{ textAlign: "center" }}>
              {selectedGame.team1} vs {selectedGame.team2}
            </h2>

            <div style={scoreboardBox}>

              {/* TEAM A */}
              <div style={teamBox}>
                <h3>{selectedGame.team1}</h3>
                <h1 style={scoreText}>{liveGame?.home_score ?? 0}</h1>

                <div style={btnRow}>
                  <button style={btnPrimary} onClick={() => updateScore(1, "home")}>+</button>
                  <button style={btnDanger} onClick={() => updateScore(-1, "home")}>-</button>
                </div>
              </div>

              {/* CENTER */}
              <div style={centerBox}>
                <h1 style={clockText}>{liveGame?.clock ?? "24:00"}</h1>
                <div>Half {liveGame?.quarter ?? 1}</div>
                <div>Down {liveGame?.down ?? 1}</div>
              </div>

              {/* TEAM B */}
              <div style={teamBox}>
                <h3>{selectedGame.team2}</h3>
                <h1 style={scoreText}>{liveGame?.away_score ?? 0}</h1>

                <div style={btnRow}>
                  <button style={btnPrimary} onClick={() => updateScore(1, "away")}>+</button>
                  <button style={btnDanger} onClick={() => updateScore(-1, "away")}>-</button>
                </div>
              </div>

            </div>

            {/* ✅ RULE FIXED SCORING */}
            <div style={sectionBox}>
              <button style={btnPrimary} onClick={() => updateScore(6, "home")}>TD</button>
              <button style={btnPrimary} onClick={() => updateScore(2, "home")}>XP1</button>
              <button style={btnPrimary} onClick={() => updateScore(1, "home")}>XP2</button>
            </div>

            <div style={sectionBox}>
              <button style={btnSecondary} onClick={togglePossession}>
                Poss: {liveGame?.possession}
              </button>
              <button style={btnSecondary} onClick={() => updateDown(1)}>1st</button>
              <button style={btnSecondary} onClick={() => updateDown(2)}>2nd</button>
              <button style={btnSecondary} onClick={() => updateDown(3)}>3rd</button>
              <button style={btnSecondary} onClick={() => updateDown(4)}>4th</button>
            </div>

            <div style={sectionBox}>
              <button style={btnPrimary} onClick={startClock}>Start</button>
              <button style={btnSecondary} onClick={stopClock}>Stop</button>
              <button style={btnSecondary} onClick={nextQuarter}>Next Half</button>
            </div>

          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {grouped.map((day) => (
          <div key={day.date}>
            <div className="card" onClick={() => setOpenDate(day.date)}>
              <div className="title">{day.date}</div>
            </div>

            {openDate === day.date &&
              Object.entries(day.times).map(([time, gamesAtTime]) => (
                <div key={time}>
                  <div className="card" style={{ background: "#e8f5e9" }}
                       onClick={() => setOpenTime(time)}>
                    <div className="title">{time}</div>
                  </div>

                  {openTime === time &&
                    gamesAtTime.map((g) => (
                      <div key={g.id} className="inner-tile">
                        <div>{g.team1} vs {g.team2}</div>

                        <button style={startBtn} onClick={() => startGame(g)}>
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
const scoreboardBox = { display: "flex", justifyContent: "space-between", padding: 20, background: "#f8fafc", borderRadius: 16 };
const teamBox = { textAlign: "center", flex: 1 };
const centerBox = { textAlign: "center", flex: 1 };
const scoreText = { fontSize: 48 };
const clockText = { fontSize: 42 };
const sectionBox = { display: "flex", gap: 10, justifyContent: "center", marginTop: 15, flexWrap: "wrap" };
const btnRow = { display: "flex", gap: 6, justifyContent: "center", marginTop: 8 };

const btnPrimary = { padding: "10px", borderRadius: 8, border: "none", background: "#2f6ea6", color: "#fff" };
const btnSecondary = { padding: "10px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" };
const btnDanger = { padding: "10px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff" };
const startBtn = { marginTop: 10, width: "100%", padding: "10px", borderRadius: 8, background: "#2f6ea6", color: "#fff" };
