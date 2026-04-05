import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function ScheduleManager() {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });

    setSchedule(data || []);
  };

  const grouped = groupByDate(schedule);

  return (
    <div style={{ padding: 20 }}>
      <h2>Schedule Manager</h2>

      <div style={{ marginTop: 20 }}>
        {Object.keys(grouped).map((date) => (
          <div key={date} style={{ marginBottom: 25 }}>
            <h3>{date}</h3>

            {grouped[date].map((g) => (
              <div
                key={g.id}
                style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 10,
                  marginTop: 8,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
                }}
              >
                <strong>{g.event_time}</strong> — {g.home_team} vs {g.away_team}
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {g.field} • {g.event_type}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function groupByDate(list) {
  return list.reduce((acc, item) => {
    if (!acc[item.event_date]) acc[item.event_date] = [];
    acc[item.event_date].push(item);
    return acc;
  }, {});
}
