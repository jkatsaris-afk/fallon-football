import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SchedulePage() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // game / practice
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*");

    if (!error) setGames(data);
  };

  // GROUP BY DATE
  const grouped = games.reduce((acc, game) => {
    if (!acc[game.event_date]) acc[game.event_date] = [];
    acc[game.event_date].push(game);
    return acc;
  }, {});

  // SORT DATES
  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  // BASE DATA
  let dayData = selectedDate ? grouped[selectedDate] || [] : [];

  // FILTER TYPE
  if (selectedType) {
    dayData = dayData.filter(g =>
      g.event_type.toLowerCase().includes(selectedType)
    );
  }

  // FILTER DIVISION
  if (selectedDivision) {
    dayData = dayData.filter(g => g.division === selectedDivision);
  }

  // UNIQUE DIVISIONS
  const divisions = [
    ...new Set((grouped[selectedDate] || []).map(g => g.division))
  ];

  return (
    <div>

      {/* ========================= */}
      {/* STEP 1: DATE */}
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
      {/* FLOW AFTER DATE */}
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
            onClick={() => {
              setSelectedDate(null);
              setSelectedType(null);
              setSelectedDivision(null);
              setShowAll(false);
            }}
          >
            <div className="sub">← Back</div>
          </div>

          {/* ========================= */}
          {/* STEP 2: TYPE */}
          {/* ========================= */}
          {!selectedType && (
            <div>

              <div
                className={`card ${selectedType === "game" ? "active-card" : ""}`}
                onClick={() => setSelectedType("game")}
              >
                <div className="title">Games</div>
              </div>

              <div
                className={`card ${selectedType === "practic" ? "active-card" : ""}`}
                onClick={() => setSelectedType("practic")}
              >
                <div className="title">Practice</div>
              </div>

            </div>
          )}

          {/* ========================= */}
          {/* STEP 3: FILTER */}
          {/* ========================= */}
          {selectedType && !selectedDivision && !showAll && (
            <div>

              <div
                className="card"
                onClick={() => setShowAll(true)}
              >
                <div className="title">Show All</div>
              </div>

              {divisions.map(div => (
                <div
                  className="card"
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                >
                  <div className="title">{div}</div>
                </div>
              ))}

            </div>
          )}

          {/* ========================= */}
          {/* RESULTS */}
          {/* ========================= */}
          {(showAll || selectedDivision) && (
            <div>

              <div
                className="card"
                onClick={() => {
                  setSelectedDivision(null);
                  setShowAll(false);
                }}
              >
                <div className="sub">← Change Filter</div>
              </div>

              {dayData.map(game => (
                <div className="card" key={game.id}>

                  <div className="title">
                    {game.event_type.toLowerCase().includes("practic")
                      ? `${game.team} Practice`
                      : `${game.team} vs ${game.opponent}`}
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
