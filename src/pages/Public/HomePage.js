import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function HomePage({ setPage }) {
  const [nextGame, setNextGame] = useState(null);

  useEffect(() => {
    fetchNextGame();
  }, []);

  const fetchNextGame = async () => {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*");

    if (error) {
      console.error("Error loading schedule:", error);
      return;
    }

    const now = new Date();

    const gamesWithTime = data.map(game => {
      const [y, m, d] = game.event_date.split("-");
      const time24 = convertTo24Hour(game.event_time);
      const [hour, minute] = time24.split(":");

      const gameDate = new Date(
        y,
        m - 1,
        d,
        parseInt(hour),
        parseInt(minute)
      );

      return {
        ...game,
        gameDate
      };
    });

    const upcoming = gamesWithTime
      .filter(g => g.gameDate > now)
      .sort((a, b) => a.gameDate - b.gameDate)[0];

    setNextGame(upcoming);
  };

  return (
    <div>

      {/* 🔥 SEASON TILE (RESTORED) */}
      <div className="card">
        <div className="title">Fallon Flag Football</div>
        <div className="sub">2026 Season</div>
      </div>

      {/* NEXT GAME */}
      <div className="card">
        <div className="title">Next Game</div>

        {nextGame ? (
          <>
            <div className="sub" style={{ marginTop: 10 }}>
              {nextGame.event_type === "practice"
                ? `${nextGame.team} Practice`
                : `${nextGame.team} vs ${nextGame.opponent}`}
            </div>

            <div className="sub">
              {formatDate(nextGame.event_date)} • {nextGame.event_time}
            </div>

            <div className="sub">
              {nextGame.field}
            </div>

            <button
              className="button"
              onClick={() => setPage("schedule")}
            >
              View Schedule
            </button>
          </>
        ) : (
          <div className="sub" style={{ marginTop: 10 }}>
            No upcoming games
          </div>
        )}
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
