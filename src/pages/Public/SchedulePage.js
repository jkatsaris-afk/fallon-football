import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SchedulePage() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error loading schedule:", error);
    } else {
      setGames(data);
    }
  };

  // 🔥 GROUP BY DATE
  const grouped = games.reduce((acc, game) => {
    if (!acc[game.event_date]) acc[game.event_date] = [];
    acc[game.event_date].push(game);
    return acc;
  }, {});

  return (
    <div>

      <div className="card">
        <div className="title">Schedule</div>
      </div>

      {Object.keys(grouped).map((date) => (
        <div key={date}>

          {/* DATE HEADER */}
          <div className="card">
            <div className="title">{formatDate(date)}</div>
          </div>

          {/* EVENTS */}
          {grouped[date].map((game) => (
            <div className="card" key={game.id}>

              {/* 🔥 GAME vs PRACTICE */}
              <div className="title">
                {game.event_type === "practice"
                  ? `${game.team} Practice`
                  : `${game.team} vs ${game.opponent}`}
              </div>

              <div className="sub">
                {game.division}
              </div>

              <div className="sub">
                {game.event_time}
              </div>

              <div className="sub">
                {game.field}
              </div>

            </div>
          ))}

        </div>
      ))}

    </div>
  );
}

/* 🔥 DATE FORMATTER */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
