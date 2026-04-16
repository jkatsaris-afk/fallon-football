import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

export default function LiveScoreboardPage() {
  const [games, setGames] = useState([]);
  const [activeGame, setActiveGame] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from("games_live")
      .select("*")
      .eq("status", "live");

    setGames(data || []);
  };

  const updateGame = async (updates) => {
    await supabase
      .from("games_live")
      .update(updates)
      .eq("id", activeGame.id);

    setActiveGame({ ...activeGame, ...updates });
  };

  /* ================= GAME SELECT ================= */

  if (!activeGame) {
    return (
      <div>

        <h2 style={title}>Live Scoreboard</h2>

        <div style={grid}>
          {games.map(g => (
            <div
              key={g.id}
              style={card}
              onClick={() => setActiveGame(g)}
            >
              <div style={matchup}>
                {g.home_team} vs {g.away_team}
              </div>

              <div style={sub}>
                {g.home_score} - {g.away_score}
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  }

  /* ================= SCOREBOARD ================= */

  return (
    <div>

      <button style={backBtn} onClick={() => setActiveGame(null)}>
        ← Back
      </button>

      <h2 style={title}>
        {activeGame.home_team} vs {activeGame.away_team}
      </h2>

      {/* SCORE DISPLAY */}
      <div style={scoreBoard}>
        <TeamScore
          name={activeGame.home_team}
          score={activeGame.home_score}
          onAdd={() => updateGame({ home_score: activeGame.home_score + 1 })}
          onSub={() => updateGame({ home_score: Math.max(0, activeGame.home_score - 1) })}
        />

        <div style={divider}>VS</div>

        <TeamScore
          name={activeGame.away_team}
          score={activeGame.away_score}
          onAdd={() => updateGame({ away_score: activeGame.away_score + 1 })}
          onSub={() => updateGame({ away_score: Math.max(0, activeGame.away_score - 1) })}
        />
      </div>

      {/* GAME CONTROL */}
      <div style={controls}>

        <div>
          <div style={label}>Quarter</div>
          <select
            value={activeGame.quarter || 1}
            onChange={(e) => updateGame({ quarter: e.target.value })}
          >
            <option value={1}>1st</option>
            <option value={2}>2nd</option>
            <option value={3}>3rd</option>
            <option value={4}>4th</option>
          </select>
        </div>

        <div>
          <div style={label}>Clock</div>
          <input
            value={activeGame.clock || "10:00"}
            onChange={(e) => updateGame({ clock: e.target.value })}
          />
        </div>

        <button
          style={endBtn}
          onClick={async () => {
            await supabase.from("game_scores").insert({
              home_team: activeGame.home_team,
              away_team: activeGame.away_team,
              home_score: activeGame.home_score,
              away_score: activeGame.away_score
            });

            await supabase
              .from("games_live")
              .update({ status: "final" })
              .eq("id", activeGame.id);

            setActiveGame(null);
            loadGames();
          }}
        >
          End Game
        </button>

      </div>

    </div>
  );
}

/* TEAM SCORE */
function TeamScore({ name, score, onAdd, onSub }) {
  return (
    <div style={teamBox}>
      <div style={teamName}>{name}</div>
      <div style={score}>{score}</div>

      <div style={btnRow}>
        <button onClick={onAdd}>+1</button>
        <button onClick={onSub}>-1</button>
      </div>
    </div>
  );
}

/* STYLES */
const grid = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:16 };
const card = { padding:16, borderRadius:16, background:"#f8fafc", cursor:"pointer" };
const matchup = { fontWeight:700 };
const sub = { fontSize:12, color:"#64748b" };

const scoreBoard = { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20 };
const teamBox = { textAlign:"center" };
const teamName = { fontWeight:700 };
const score = { fontSize:32, margin:"10px 0" };

const btnRow = { display:"flex", gap:6, justifyContent:"center" };
const divider = { fontWeight:700 };

const controls = { display:"flex", gap:20, marginTop:20, alignItems:"center" };
const label = { fontSize:12, color:"#64748b" };

const endBtn = { background:"#ef4444", color:"#fff", padding:"10px 14px", borderRadius:10 };

const backBtn = { marginBottom:10 };
const title = { fontSize:22, fontWeight:700 };
