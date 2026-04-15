import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const TIMES = ["9:30", "10:30", "11:30", "12:30"];

export default function RefAvailabilityPage({ user }) {
  const [availability, setAvailability] = useState({});
  const [week, setWeek] = useState(1);

  useEffect(() => {
    loadAvailability();
  }, [week]);

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("ref_availability")
      .select("*")
      .eq("referee_id", user.id)
      .eq("week", week);

    const map = {};

    data?.forEach((a) => {
      map[a.time_block] = a.available;
    });

    setAvailability(map);
  };

  const toggle = (time) => {
    setAvailability((prev) => ({
      ...prev,
      [time]: !prev[time],
    }));
  };

  const save = async () => {
    for (let time of TIMES) {
      await supabase.from("ref_availability").upsert(
        {
          referee_id: user.id,
          week,
          time_block: time,
          available: availability[time] || false,
        },
        {
          onConflict: "referee_id,week,time_block",
        }
      );
    }

    alert("Availability Saved");
  };

  return (
    <div style={wrap}>
      <div style={title}>My Availability</div>

      <div style={grid}>
        {TIMES.map((t) => {
          const value = availability[t];

          return (
            <button
              key={t}
              style={{
                ...pill,
                background:
                  value === true
                    ? "#16a34a"
                    : value === false
                    ? "#ef4444"
                    : "#e5e7eb",
                color:
                  value === true || value === false
                    ? "#fff"
                    : "#111",
              }}
              onClick={() => toggle(t)}
            >
              {t}
            </button>
          );
        })}
      </div>

      <button style={saveBtn} onClick={save}>
        Save Availability
      </button>
    </div>
  );
}

/* STYLES */

const wrap = {
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const title = {
  fontSize: 20,
  fontWeight: 700,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
  gap: 10,
};

const pill = {
  padding: 14,
  borderRadius: 12,
  border: "none",
  fontWeight: 600,
  cursor: "pointer",
};

const saveBtn = {
  padding: 12,
  borderRadius: 12,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600,
};
