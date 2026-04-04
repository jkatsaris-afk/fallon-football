import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScoreboardManager() {
  const [schedule, setSchedule] = useState([]);
  const [selectedGames, setSelectedGames] = useState([null, null, null]);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .eq("event_type", "game");

    setSchedule(data || []);
  };

  const setGame = async (slot, game) => {
    const updated = [...selectedGames];
    updated[slot] = game;
    setSelectedGames(updated);

    await supabase.from("scoreboard_live").insert({
      game_id: game.id,
      team: game.team,
      opponent: game.opponent,
      division: game.division,
      game_time: game.event_time,
      field: game.field,
      is_live: true
    });
  };

  const updateScore = async (id, field, value) => {
    await supabase
      .from("scoreboard_live")
      .update({ [field]: value })
      .eq("id", id);
  };

  return (
    <div>

      <div className="card">
        <div className="title">Scoreboard Manager</div>
      </div>

      {[0,1,2].map(slot => (
        <div key={slot} className="card">

          <div className="title">Slot {slot + 1}</div>

          <select
            onChange={(e) =>
              setGame(slot, schedule[e.target.value])
            }
          >
            <option>Select Game</option>
            {schedule.map((g, i) => (
              <option key={i} value={i}>
                {g.team} vs {g.opponent} ({g.event_time})
              </option>
            ))}
          </select>

        </div>
      ))}

    </div>
  );
}
