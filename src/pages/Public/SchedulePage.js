import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function SchedulePage() {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date", { ascending: true });

    if (!error) setGames(data);
  };

  // GROUP BY DATE
  const grouped = games.reduce((acc, game) => {
    if (!acc[game.event_date]) acc[game.event_date] = [];
    acc[game.event_date].push(game);
    return acc;
  }, {});

  const dates = Object.keys(grouped);

  // FILTERED DATA
  let filteredGames = selectedDate ? grouped[selectedDate] || [] : [];

  if (selectedDivision) {
    filteredGames = filteredGames.filter(
      g => g.division === selectedDivision
    );
  }

  if (selectedTeam) {
    filteredGames = filteredGames.filter(
      g => g.team === selectedTeam || g.opponent === selectedTeam
    );
  }

  // UNIQUE DIVISIONS
  const divisions = [
    ...new Set((grouped[selectedDate] || []).map(g => g.division))
  ];

  // UNIQUE TEAMS
  const teams = [
    ...new Set(filteredGames.map(g => g.team))
  ];

  return (
    <div>

      {/* HEADER */}
      <div className="card">
        <div className="title">Schedule</div>
      </div>

      {/* ========================= */}
      {/* DATE VIEW */}
      {/* ========================= */}
      {!selectedDate && dates.map(date => (
        <div
          className="card"
          key={date}
          onClick={() => setSelectedDate(date)}
          style={{ cursor: "pointer" }}
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

          {/* BACK */}
          <div
            className="card"
            onClick={() => {
              setSelectedDate(null);
              setSelectedDivision(null);
              setSelectedTeam(null);
              setShowAll(false);
            }}
            style={{ cursor: "pointer" }}
          >
            <div className="sub">← Back</div>
          </div>

          {/* DATE TITLE */}
          <div className="card">
            <div className="title">{formatDate(selectedDate)}</div>
          </div>

          {/* ========================= */}
          {/* STEP 1: SHOW ALL OR DIVISION */}
          {/* ========================= */}
          {!showAll && !selectedDivision && (
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
          {/* STEP 2: TEAM SELECT */}
          {/* ========================= */}
          {selectedDivision && !selectedTeam && (
            <div>

              <div
                className="card"
                onClick={() => setSelectedDivision(null)}
              >
                <div className="sub">← Back to Divisions</div>
              </div>

              {teams.map(team => (
                <div
                  className="card"
                  key={team}
                  onClick={() => setSelectedTeam(team)}
                >
                  <div className="title">{team}</div>
                </div>
              ))}

            </div>
          )}

          {/* ========================= */}
          {/* RESULTS */}
          {/* ========================= */}
          {(showAll || selectedTeam) && (
            <div>

              <div
                className="card"
                onClick={() => {
                  setSelectedDivision(null);
                  setSelectedTeam(null);
                  setShowAll(false);
                }}
              >
                <div className="sub">← Reset Filters</div>
              </div>

              {filteredGames.map(game => (
                <div className="card" key={game.id}>

                  <div className="title">
                    {game.event_type === "practice"
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

/* FIXED DATE */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
