import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardPage() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetch();

    const sub = supabase
      .channel("live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scoreboard_live" }, fetch)
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  const fetch = async () => {
    const { data } = await supabase
      .from("scoreboard_live")
      .select("*")
      .eq("is_live", true);

    setGames(data || []);
  };

  return (
    <div>
      <div className="card">
        <div className="title">Live Scoreboard</div>
      </div>

      {games.map(g => (
        <div className="score-tile" key={g.id}>
          <div>{g.team}</div>
          <div className="score-main">{g.home_score}</div>
          <div className="score-vs">vs</div>
          <div className="score-main">{g.away_score}</div>
          <div>{g.opponent}</div>
        </div>
      ))}
    </div>
  );
}
