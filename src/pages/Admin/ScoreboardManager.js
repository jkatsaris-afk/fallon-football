import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager({ deviceMode }) {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    setGames(data || []);
  };

  /* CLEAN */
  const cleanGames = games
    .map(g => ({
      ...g,
      clean_date: normalizeDate(g.event_date),
      clean_type: (g.event_type || "").toLowerCase()
    }))
    .filter(g => g.clean_type.includes("game"));

  /* GROUP BY DATE */
  const groupedDates = cleanGames.reduce((acc, g) => {
    if (!acc[g.clean_date]) acc[g.clean_date] = [];
    acc[g.clean_date].push(g);
    return acc;
  }, {});

  const dates = Object.keys(groupedDates).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  /* TIME SLOTS */
  const timeSlots = selectedDate
    ? [...new Set(groupedDates[selectedDate].map(g => g.event_time))]
    : [];

  /* FILTERED GAMES */
  const filteredGames =
    selectedDate && selectedTime
      ? groupedDates[selectedDate]
          .filter(g => g.event_time === selectedTime)
          .sort((a, b) => a.field.localeCompare(b.field))
      : [];

  return (
    <div className={`layout ${deviceMode}`}>

      {/* LEFT PANEL */}
      <div className="score-panel">

        {!selectedGame && (
          <div className="card">
            <div className="title">Select a Game</div>
          </div>
        )}

        {selectedGame && (
          <div className="card">

            <div className="title">
              {selectedGame.team} vs {selectedGame.opponent}
            </div>

            <div className="sub">
              {selectedGame.event_time} • {selectedGame.field}
            </div>

            <div className="score-controls">

              <div className="score-box">
                <div>{selectedGame.team}</div>
                <input className="score-input" type="number" />
              </div>

              <div className="score-box">
                <div>{selectedGame.opponent}</div>
                <input className="score-input" type="number" />
              </div>

            </div>

          </div>
        )}

      </div>

      {/* RIGHT PANEL */}
      <div className="list-panel">

        {!selectedDate &&
          dates.map(date => (
            <div
              key={date}
              className="card"
              onClick={() => setSelectedDate(date)}
            >
              <div className="title">{formatDate(date)}</div>
            </div>
          ))}

        {selectedDate && !selectedTime && (
          <>
            <div className="card active-card">
              <div className="title">{formatDate(selectedDate)}</div>
            </div>

            <div
              className="card"
              onClick={() => setSelectedDate(null)}
            >
              <div className="sub">← Back</div>
            </div>

            {timeSlots.map(time => (
              <div
                key={time}
                className="card"
                onClick={() => setSelectedTime(time)}
              >
                <div className="title">{time}</div>
              </div>
            ))}
          </>
        )}

        {selectedTime &&
          filteredGames.map(g => (
            <div
              key={g.id}
              className="card"
              onClick={() => setSelectedGame(g)}
            >
              <div className="title">
                {g.team} vs {g.opponent}
              </div>
              <div className="sub">{g.field}</div>
            </div>
          ))}

      </div>

    </div>
  );
}

/* HELPERS */
function normalizeDate(dateStr) {
  if (dateStr.includes("-")) return dateStr;
  const [m, d, y] = dateStr.split("/");
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });
}
