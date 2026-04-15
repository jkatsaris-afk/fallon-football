import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const TIMES = ["9:30", "10:30", "11:30", "12:30"];

export default function RefAvailabilityPage({ user }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [refId, setRefId] = useState(null);
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    loadWeeks();
    getRefId();
  }, []);

  useEffect(() => {
    if (refId && selectedWeek) {
      loadAvailability();
    }
  }, [refId, selectedWeek]);

  /* ---------------- LOAD ---------------- */

  const loadWeeks = async () => {
    const { data } = await supabase
      .from("schedule_master_auto")
      .select("week");

    const unique = [...new Set(data.map((g) => g.week))].sort((a, b) => a - b);
    setWeeks(unique);
  };

  const getRefId = async () => {
    const { data } = await supabase
      .from("referees")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (data) setRefId(data.id);
  };

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("ref_availability")
      .select("*")
      .eq("referee_id", refId)
      .eq("week", selectedWeek);

    const map = {};

    data?.forEach((a) => {
      map[a.time_block] = a.available === true; // ✅ FIX
    });

    setAvailability(map);
  };

  /* ---------------- TOGGLE ---------------- */

  const toggle = (time) => {
    setAvailability((prev) => ({
      ...prev,
      [time]: !prev[time],
    }));
  };

  /* ---------------- SAVE ---------------- */

  const save = async () => {
    for (let time of TIMES) {
      const value = availability[time];

      const { error } = await supabase
        .from("ref_availability")
        .upsert(
          {
            referee_id: refId,
            week: selectedWeek,
            time_block: time,
            available: value === true, // ✅ FIX (no nulls)
          },
          {
            onConflict: "referee_id,week,time_block", // ✅ requires DB constraint
          }
        );

      if (error) {
        console.error("SAVE ERROR:", error);
      }
    }

    alert("Availability Saved");
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      {/* WEEK SELECT */}
      {!selectedWeek && (
        <>
          <div style={title}>Select Week</div>

          <div style={grid}>
            {weeks.map((w) => (
              <div
                key={w}
                style={tile}
                onClick={() => setSelectedWeek(w)}
              >
                Week {w}
              </div>
            ))}
          </div>
        </>
      )}

      {/* AVAILABILITY */}
      {selectedWeek && (
        <>
          <div style={title}>
            Week {selectedWeek} Availability
          </div>

          <div style={timeGrid}>
            {TIMES.map((t) => {
              const value = availability?.[t];

              return (
                <button
                  key={t}
                  style={{
                    ...timeBtn,
                    background:
                      value === true
                        ? "#16a34a"
                        : "#e5e7eb",
                    color:
                      value === true
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

          <div style={actionRow}>
            <button style={primaryBtn} onClick={save}>
              Save
            </button>

            <button
              style={secondaryBtn}
              onClick={() => setSelectedWeek(null)}
            >
              Change Week
            </button>
          </div>
        </>
      )}

    </div>
  );
}

/* ---------------- STYLES ---------------- */

const wrap = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 20
};

const title = {
  fontSize: 20,
  fontWeight: 700
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))",
  gap: 12
};

const tile = {
  background: "#fff",
  padding: 18,
  borderRadius: 16,
  textAlign: "center",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};

const timeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 8
};

const timeBtn = {
  padding: 12,
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 600
};

const actionRow = {
  display: "flex",
  gap: 10
};

const primaryBtn = {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600
};

const secondaryBtn = {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  border: "none",
  background: "#e5e7eb",
  fontWeight: 600
};
