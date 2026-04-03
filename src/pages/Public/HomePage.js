import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function HomePage({ setPage }) {
  const [upcomingGames, setUpcomingGames] = useState([]);

  useEffect(() => {
    fetchGames();

    // 🔥 auto refresh every minute
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

    const validGames = data
      // 🚨 REMOVE PRACTICES (handles typo too)
      .filter(g => !g.event_type.toLowerCase().includes("practic"))

      .map(game => {
        const [y, m, d] = game.event_date.split("-");
        const time24 = convertTo24Hour(game.event_time);
        const [hour, minute] = time24.split(":");

        const gameStart = new Date(
          y,
          m - 1,
          d,
          parseInt(hour),
          parseInt(minute)
        );

        // 🔥 add 15 minutes buffer
        const gameEnd = new Date(gameStart.getTime() + 15 * 60000);

        return {
          ...game,
          gameStart,
          gameEnd
        };
      })

      // 🔥 ONLY future or still-active games
      .filter(g => g.gameEnd > now)

      // 🔥 sort by next game
      .sort((a, b) => a.gameStart - b.gameStart);

    setUpcomingGames(validGames);
  };

  return (
    <div>

      {/* SEASON TILE */}
      <div className="card">
        <div className="title">Fallon Flag Football</div>
        <div className="sub">2026 Season</div>
      </div>

      {/* 🔥 UPCOMING GAMES */}
      <div className="card">
        <div className="title">Upcoming Games</div>

        {upcomingGames.length > 0 ? (
          upcomingGames.slice(0, 3).map(game => (
            <div key={game.id} style={{ marginTop: 10 }}>

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
          ))
        ) : (
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
