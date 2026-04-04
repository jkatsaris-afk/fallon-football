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

  const cleanGames = games
    .map(g => ({
      ...g,
      clean_date: normalizeDate(g.event_date),
      clean_type: (g.event_type || "").toLowerCase()
    }))
    .filter(g => g.clean_type.includes("game"));

  const groupedDates = cleanGames.reduce((acc, g) => {
    if (!acc[g.clean_date]) acc[g.clean_date] = [];
    acc[g.clean_date].push(g);
    return acc;
  }, {});

  const dates = Object.keys(groupedDates).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const timeSlots = selectedDate
    ? [...new Set(groupedDates[selectedDate].map(g => g.event_time))]
    : [];

  const filteredGames =
    selectedDate && selectedTime
      ? groupedDates[selectedDate]
          .filter(g => g.event_time === selectedTime)
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
