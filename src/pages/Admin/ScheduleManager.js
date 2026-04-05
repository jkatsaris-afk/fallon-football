import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScheduleManager() {
  const [schedule, setSchedule] = useState([]);
  const [fields, setFields] = useState([]);
  const [mode, setMode] = useState("test"); // 🔥 toggle

  useEffect(() => {
    loadAll();
  }, [mode]);

  const TABLE = mode === "test" ? "schedule_test" : "schedule_master";

  /* ================= LOAD ================= */

  const loadAll = async () => {
    loadSchedule();
    loadFields();
  };

  const loadSchedule = async () => {
    const { data } = await supabase
      .from(TABLE)
      .select("*")
      .order("week");

    setSchedule(data || []);
  };

  const loadFields = async () => {
    const { data } = await supabase
      .from("fields")
      .select("*")
      .eq("type", "game")
      .order("field_number");

    setFields(data || []);
  };

  /* ================= GENERATE ================= */

  const generateSchedule = async () => {
    const { data: matchups } = await supabase
      .from("matchups")
      .select("*")
      .order("week");

    const { data: fields } = await supabase
      .from("fields")
      .select("*")
      .eq("type", "game")
      .order("field_number");

    const { data: timeSlots } = await supabase
      .from("field_time_slots")
      .select("*")
      .eq("field_type", "game")
      .order("sort_order");

    await supabase.from(TABLE).delete();

    let scheduleInsert = [];

    const weeks = [...new Set(matchups.map(m => m.week))];

    weeks.forEach(week => {
      const weekGames = matchups.filter(m => m.week === week);

      let gameIndex = 0;

      timeSlots.forEach(time => {
        fields.forEach(field => {
          const game = weekGames[gameIndex];
          if (!game) return;

          scheduleInsert.push({
            matchup_id: game.id,
            week: week,
            field_id: field.id,
            time: time.time,
            event_type: "game"
          });

          gameIndex++;
        });
      });
    });

    const { error } = await supabase.from(TABLE).insert(scheduleInsert);

    if (error) {
      console.error(error);
      alert("Error creating schedule");
    } else {
      loadSchedule();
      alert(`Schedule created in ${TABLE}`);
    }
  };

  /* ================= GROUP ================= */

  const weeks = [...new Set(schedule.map(s => s.week))];

  return (
    <div>

      <h1>Schedule Manager</h1>

      {/* 🔥 TOGGLE */}
      <div style={toggleRow}>
        <button
          style={toggleBtn(mode === "test")}
          onClick={() => setMode("test")}
        >
          Test
        </button>

        <button
          style={toggleBtn(mode === "live")}
          onClick={() => setMode("live")}
        >
          Live
        </button>
      </div>

      <button style={btn} onClick={generateSchedule}>
        Generate Schedule ({mode})
      </button>

      {/* ================= SCHEDULE ================= */}

      {weeks.map(week => {
        const weekGames = schedule.filter(s => s.week === week);
        const times = [...new Set(weekGames.map(g => g.time))];

        return (
          <div key={week} style={weekBlock}>

            <div style={weekHeader}>WEEK {week}</div>

            {/* HEADER */}
            <div style={rowHeader}>
              <div style={timeCell}></div>
              {fields.map(field => (
                <div key={field.id} style={fieldHeader}>
                  {field.name}
                </div>
              ))}
            </div>

            {/* ROWS */}
            {times.map(time => (
              <div key={time} style={row}>

                <div style={timeCell}>{time}</div>

                {fields.map(field => {
                  const game = weekGames.find(
                    g => g.time === time && g.field_id === field.id
                  );

                  return (
                    <div key={field.id} style={cell}>
                      {game ? "Game" : ""}
                    </div>
                  );
                })}

              </div>
            ))}

          </div>
        );
      })}

    </div>
  );
}

/* ================= STYLES ================= */

const btn = {
  marginTop: 10,
  padding: "12px 18px",
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer"
};

const toggleRow = {
  display: "flex",
  gap: 10,
  marginBottom: 10
};

const toggleBtn = (active) => ({
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: active ? "#2f6ea6" : "#e2e8f0",
  color: active ? "#fff" : "#000",
  cursor: "pointer"
});

const weekBlock = {
  marginTop: 25,
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
};

const weekHeader = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 15
};

const rowHeader = {
  display: "flex",
  fontWeight: "600",
  marginBottom: 10
};

const row = {
  display: "flex",
  marginBottom: 8
};

const timeCell = {
  width: 100,
  fontWeight: "600"
};

const fieldHeader = {
  flex: 1,
  textAlign: "center"
};

const cell = {
  flex: 1,
  background: "#f1f5f9",
  borderRadius: 6,
  margin: 2,
  padding: 8,
  textAlign: "center"
};
