import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SchedulePage() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error(error);
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

  const dates = Object.keys(grouped);

  return (
    <div>

      {/* HEADER */}
      <div className="card">
        <div className="title">Schedule</div>
      </div>

      {/* ========================= */}
      {/* DATE VIEW */}
      {/* ========================= */}
      {!selectedDate && dates.map((date) => (
        <div
          className="card"
          key={date}
          onClick={() => setSelectedDate(date)}
          style={{ cursor: "pointer" }}
        >
          <div className="title">{formatDate(date)}</div>
          <div className="sub">
            {grouped[date].length} events
          </div>
        </div>
      ))}

      {/* ========================= */}
      {/* DAY VIEW */}
      {/* ========================= */}
      {selectedDate && (
        <div>

          {/* BACK BUTTON */}
          <div
            className="card"
            onClick={() => setSelectedDate(null)}
            style={{ cursor: "pointer" }}
          >
            <div className="sub">← Back to Dates</div>
          </div>

          {/* DATE TITLE */}
          <div className="card">
            <div className="title">
              {formatDate(selectedDate)}
            </div>
          </div>

          {/* EVENTS */}
          {grouped[selectedDate].map((game) => (
            <div className="card" key={game.id}>

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
      )}

    </div>
  );
}

/* DATE FORMATTER */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
