import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SchedulePage() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    setGames(data || []);
  };

  /* ========================= */
  /* GROUP + SORT */
  /* ========================= */
  const grouped = games.reduce((acc, game) => {
    if (!acc[game.event_date]) acc[game.event_date] = [];
    acc[game.event_date].push(game);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  /* ========================= */
  /* FILTERING */
  /* ========================= */
  let dayData = selectedDate ? grouped[selectedDate] || [] : [];

  if (selectedType) {
    dayData = dayData.filter(g =>
      g.event_type.toLowerCase().includes(selectedType)
    );
  }

  if (selectedDivision) {
    dayData = dayData.filter(g => g.division === selectedDivision);
  }

  const divisions = [
    ...new Set((grouped[selectedDate] || []).map(g => g.division))
  ];

  return (
    <div>

      {/* ========================= */}
      {/* STEP 1: DATE SELECT */}
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
      {/* AFTER DATE SELECT */}
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
          {/* STEP 2: TYPE SELECT */}
          {/* ========================= */}
          {!selectedType && (
            <>
              <div
                className="card"
                onClick={() => setSelectedType("game")}
              >
                <div className="title">Games</div>
              </div>

              <div
                className="card"
                onClick={() => setSelectedType("practic")}
              >
                <div className="title">Practice</div>
              </div>
            </>
          )}

          {/* ========================= */}
          {/* STEP 3: FILTER */}
          {/* ========================= */}
          {selectedType && !selectedDivision && !showAll && (
            <>
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
            </>
          )}

          {/* ========================= */}
          {/* RESULTS */}
          {/* ========================= */}
          {(showAll || selectedDivision) && (
            <div>

              {/* CHANGE FILTER */}
              <div
                className="card"
                onClick={() => {
                  setSelectedDivision(null);
                  setShowAll(false);
                }}
              >
                <div className="sub">← Change Filter</div>
              </div>

              {dayData.map((game, index) => (
                <div key={game.id}>

                  {index !== 0 && <div className="divider" />}

                  <div className="inner-tile">

                    {/* ========================= */}
                    {/* PRACTICE */}
                    {/* ========================= */}
                    {game.event_type.toLowerCase().includes("practic") && (
                      <div className="game-row">

                        <div className="game-top">
                          <div className="team">{game.team}</div>
                          <div className="game-time">{game.event_time}</div>
                        </div>

                        <div className="vs">Practice</div>

                        <div className="game-bottom">
                          <div className="sub">{game.division}</div>
                          <div className="field-badge">{game.field}</div>
                        </div>

                      </div>
                    )}

                    {/* ========================= */}
                    {/* GAME */}
                    {/* ========================= */}
                    {game.event_type.toLowerCase() === "game" && (
                      <div className="game-row">

                        <div className="game-top">
                          <div className="team">{game.team}</div>
                          <div className="game-time">{game.event_time}</div>
                        </div>

                        <div className="vs">vs</div>

                        <div className="game-bottom">
                          <div className="team">{game.opponent}</div>
                          <div className="field-badge">{game.field}</div>
                        </div>

                      </div>
                    )}

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>
      )}

    </div>
  );
}

/* ========================= */
/* DATE FORMAT */
/* ========================= */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
