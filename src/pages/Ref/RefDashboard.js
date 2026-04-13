import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefDashboard() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date", { ascending: true });

    setGames(data || []);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Referee Dashboard</h2>

      {games.map(game => (
        <div key={game.id} style={card}>
          <div style={{ fontWeight: 600 }}>
            {game.home_team} vs {game.away_team}
          </div>

          <div>{game.event_date}</div>
          <div>{game.event_time}</div>
          <div>Field {game.field}</div>
        </div>
      ))}
    </div>
  );
}

const card = {
  background: "#fff",
  padding: 12,
  borderRadius: 10,
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
};
