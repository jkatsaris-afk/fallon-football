import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function TeamSchedulesPage({ setPage }) {
  const [games, setGames] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    if (!data) return;
    setGames(data);
  };

  // (still useful later if you want counts or features)
  const teamList = [...new Set(
    games.map(g => `${g.division} ${g.team}`)
  )].sort();

  // ✅ YOUR GOOGLE DRIVE FOLDER
  const scheduleFolder =
    "https://drive.google.com/drive/folders/1Fg9x-JOQhCMOBrSfRdzup0oqLaeTekwA";

  return (
    <div>

      {/* HEADER */}
      <div className="card active-card">
        <div className="title">Full Team Schedules</div>
      </div>

      {/* BACK */}
      <div className="card" onClick={() => setPage("schedule")}>
        <div className="sub">← Back to Schedule</div>
      </div>

      {/* 🔥 MAIN TILE */}
      <div
        className="card"
        onClick={() => window.open(scheduleFolder, "_blank")}
      >
        <div className="title">View All Team Schedules</div>
        <div className="sub">Opens Google Drive folder</div>
      </div>

    </div>
  );
}
