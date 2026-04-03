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
      .select("*");

    if (!error) setGames(data);
  };

  // 🔥 GROUP BY DATE
  const grouped = games.reduce((acc, game) => {
    if (!acc[game.event_date]) acc[game.event_date] = [];
    acc[game.event_date].push(game);
    return acc;
  }, {});

  // 🔥 SORT DATES CORRECTLY
  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  // 🔥 SPLIT DATA
  const dayGames = selectedDate ? grouped[selectedDate] || [] : [];

  const practiceGames = dayGames.filter(g =>
    g.event_type.toLowerCase().includes("practic")
  );

  const actualGames = dayGames.filter(g =>
    g.event_type.toLowerCase() === "game"
  );

  return (
    <div>

      {/* ========================= */}
      {/* DATE VIEW */}
      {/* ========================= */}
      {!selectedDate && dates.map(date => (
        <div
          className="card"
          key={date}
          onClick={() => setSelectedDate(date)}
        >
          <div className="title">{formatDate(date)}</div>
          <div className="sub">{grouped[date].length} events</div>
        </div>
      ))}

      {/* ========================= */}
      {/* DAY VIEW */}
      {/* ========================= */}
      {selectedDate && (
        <div>

          {/* DATE TILE */}
          <div className="card active-card">
            <div className="title">{formatDate(selectedDate)}</div>
          </div>

          {/* BACK */}
          <div
            className="card"
            onClick={() => setSelectedDate(null)}
          >
            <div className="sub">← Back</div>
          </div>

          {/* ========================= */}
          {/* PRACTICE SECTION */}
          {/* ========================= */}
          {practiceGames.length > 0 && (
            <div>
              <div className="card">
                <div className="title">Practice</div>
              </div>

              {practiceGames.map(game => (
                <div className="card" key={game.id}>
                  <div className="title">{game.team} Practice</div>
                  <div className="sub">{game.event_time}</div>
                  <div className="sub">{game.field}</div>
                </div>
              ))}
            </div>
          )}

          {/* ========================= */}
          {/* GAME SECTION */}
          {/* ========================= */}
          {actualGames.length > 0 && (
            <div>
              <div className="card">
                <div className="title">Games</div>
              </div>

              {actualGames.map(game => (
                <div className="card" key={game.id}>
                  <div className="title">
                    {game.team} vs {game.opponent}
                  </div>
                  <div className="sub">{game.division}</div>
                  <div className="sub">{game.event_time}</div>
                  <div className="sub">{game.field}</div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

/* DATE FIX */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
