import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardPage() {
  const [liveGames, setLiveGames] = useState([]);
  const [pastGames, setPastGames] = useState([]);

  useEffect(() => {
    fetchScores();

    const channel = supabase
      .channel("scores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scoreboard_live" },
        () => fetchScores()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchScores = async () => {
    const { data } = await supabase
      .from("scoreboard_live")
      .select("*")
      .order("updated_at", { ascending: false });

    const live = data.filter(g => g.is_live).slice(0, 3);
    const past = data.filter(g => !g.is_live);

    setLiveGames(live);
    setPastGames(past);
  };

  return (
    <div>

      {/* LIVE TILE */}
      <div className="card">
        <div className="title">Live Scoreboard</div>
      </div>

      {liveGames.map(game => (
        <div key={game.id} className="score-tile">

          <div className="score-team">{game.team}</div>
          <div className="score-main">{game.home_score}</div>

          <div className="score-vs">vs</div>

          <div className="score-main">{game.away_score}</div>
          <div className="score-team">{game.opponent}</div>

          <div className="score-meta">
            {game.division} • {game.field}
          </div>

        </div>
      ))}

      {/* PAST GAMES */}
      <div className="card">
        <div className="title">Recent Scores</div>
      </div>

      {pastGames.map((game, i) => (
        <div key={i}>

          {i !== 0 && <div className="divider" />}

          <div className="inner-tile">

            <div className="game-top">
              <div className="team">{game.team}</div>
              <div className="game-time">{game.home_score}</div>
            </div>

            <div className="vs">vs</div>

            <div className="game-bottom">
              <div className="team">{game.opponent}</div>
              <div className="game-time">{game.away_score}</div>
            </div>

          </div>

        </div>
      ))}

    </div>
  );
}
