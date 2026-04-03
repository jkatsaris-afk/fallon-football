import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function HomePage({ setPage }) {
  const [liveGames, setLiveGames] = useState([]);
  const [upcomingGames, setUpcomingGames] = useState([]);

  useEffect(() => {
    fetchGames();

    const interval = setInterval(fetchGames, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    const now = new Date();

    const processed = data
      // 🔥 REMOVE PRACTICES
      .filter(g => !g.event_type.toLowerCase().includes("practic"))

      .map(game => {
        const [y, m, d] = game.event_date.split("-");
        const time24 = convertTo24Hour(game.event_time);
        const [hour, minute] = time24.split(":");

        const start = new Date(y, m - 1, d, hour, minute);
        const end = new Date(start.getTime() + 15 * 60000);

        return {
          ...game,
          start,
          end
        };
      });

    // 🔥 LIVE
    const live = processed.filter(
      g => g.start <= now && g.end > now
    );

    // 🔥 UPCOMING
    const upcoming = processed
      .filter(g => g.start > now)
      .sort((a, b) => a.start - b.start);

    setLiveGames(live);
    setUpcomingGames(upcoming);
  };

  return (
    <div>

      {/* SEASON TILE */}
      <div className="card">
        <div className="title">Fallon Flag Football</div>
        <div className="sub">2026 Season</div>
      </div>

      {/* 🔥 LIVE / UPCOMING */}
      <div className="card">

        <div className="title">
          {liveGames.length > 0 ? "Live Games" : "Upcoming Games"}
        </div>

        {/* ========================= */}
        {/* LIVE GAMES */}
        {/* ========================= */}
        {liveGames.length > 0 && liveGames.map((game, index) => (
          <div key={game.id}>

            {index !== 0 && <div className="divider" />}

            <div style={{ marginTop: 10 }}>

              <div className="sub" style={{ color: "#0f7a3b", fontWeight: 600 }}>
                ● LIVE NOW
              </div>

              <div className="sub">
                {game.team} vs {game.opponent}
              </div>

              <div className="sub">
                {game.event_time} • {game.field}
              </div>

            </div>

          </div>
        ))}

        {/* ========================= */}
        {/* UPCOMING GAMES */}
        {/* ========================= */}
        {liveGames.length === 0 && upcomingGames.length > 0 &&
          upcomingGames.slice(0, 3).map((game, index) => (
            <div key={game.id}>

              {index !== 0 && <div className="divider" />}

              <div style={{ marginTop: 10 }}>

                <div className="sub">
                  {game.team} vs {game.opponent}
                </div>

                <div className="sub">
                  {formatDate(game.event_date)} • {game.event_time}
                </div>

                <div className="sub">
                  {game.field}
                </div>

              </div>

            </div>
          ))
        }

        {/* EMPTY */}
        {liveGames.length === 0 && upcomingGames.length === 0 && (
          <div className="sub" style={{ marginTop: 10 }}>
            No upcoming games
          </div>
        )}

        <button
          className="button"
          onClick={() => setPage("schedule")}
        >
          View Schedule
        </button>

      </div>

      {/* ANNOUNCEMENTS */}
      <div className="card">
        <div className="title">Announcements</div>
        <div className="sub" style={{ marginTop: 10 }}>
          Season starts April 11th!
        </div>
      </div>

    </div>
  );
}

/* TIME FIX */
function convertTo24Hour(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");

  if (modifier === "PM" && hours !== "12") {
    hours = parseInt(hours) + 12;
  }

  if (modifier === "AM" && hours === "12") {
    hours = "00";
  }

  return `${hours}:${minutes}`;
}

/* DATE FIX */
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
