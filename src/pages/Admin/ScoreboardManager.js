import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .eq("event_type", "game");

    setGames(data || []);
  };

  const goLive = async (g) => {
    await supabase.from("scoreboard_live").insert({
      game_id: g.id,
      team: g.team,
      opponent: g.opponent,
      division: g.division,
      game_time: g.event_time,
      field: g.field
    });
  };

  return (
    <div>
      <div className="card">
        <div className="title">Score Manager</div>
      </div>

      {games.map(g => (
        <div className="card" key={g.id}>
          <div>{g.team} vs {g.opponent}</div>
          <button className="button" onClick={() => goLive(g)}>
            Start Game
          </button>
        </div>
      ))}
    </div>
  );
}
