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
    const { data, error } = await supabase
      .from("schedule_master_auto")
      .select("week");

    if (error) {
      console.error("Weeks load error:", error);
      return;
    }

    const unique = [...new Set(data.map((g) => g.week))].sort((a, b) => a - b);
    setWeeks(unique);
  };

  const getRefId = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("referees")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (error) {
      console.error("Ref lookup error:", error);
      return;
    }

    if (data) setRefId(data.id);
  };

  const loadAvailability = async () => {
    const { data, error } = await supabase
      .from("ref_availability")
      .select("*")
      .eq("referee_id", refId)
      .eq("week", selectedWeek);

    if (error) {
      console.error("Availability load error:", error);
      return;
    }

    const map = {};
    data?.forEach((a) => {
      map[a.time_block] = a.available;
    });

    setAvailability(map);
  };

  /* ---------------- TOGGLE + LIVE SAVE ---------------- */

  const toggle = async (time) => {
    if (!refId || !selectedWeek) {
      console.warn("Missing refId or week");
      return;
    }

    const current = availability?.[time];

    // default TRUE if not set
    const newValue = current === undefined ? false : !current;

    // update UI immediately
    setAvailability((prev) => ({
      ...prev,
      [time]: newValue,
    }));

    console.log("Saving:", {
      refId,
      selectedWeek,
      time,
      newValue,
    });

    const { error } = await supabase
      .from("ref_availability")
      .upsert(
        [
          {
            referee_id: refId,
            week: selectedWeek,
            time_block: time,
            available: newValue,
          },
        ],
        {
          onConflict: ["referee_id", "week", "time_block"],
        }
      )
      .select();

    if (error) {
      console.error("LIVE SAVE ERROR:", error);
    } else {
      console.log("Saved OK");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      <div style={title}>My Availability</div>

      {/* WEEK SELECT */}
      <div style={weekRow}>
        {weeks.map((w) => (
          <div
            key={w}
            style={{
              ...weekTile,
              background: selectedWeek === w ? "#16a34a" : "#fff",
              color: selectedWeek === w ? "#fff" : "#111",
            }}
            onClick={() => setSelectedWeek(w)}
          >
            W{w}
          </div>
        ))}
      </div>

      {/* TIMES */}
      {selectedWeek && (
        <>
          <div style={subTitle}>Week {selectedWeek}</div>

          <div style={timeGrid}>
            {TIMES.map((t) => {
              const value = availability?.[t];

              const isAvailable =
                value === undefined || value === true;

              return (
                <button
                  key={t}
                  style={{
                    ...timeBtn,
                    background: isAvailable ? "#16a34a" : "#e5e7eb",
                    color: isAvailable ? "#fff" : "#111",
                  }}
                  onClick={() => toggle(t)}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div style={hint}>
            Tap to toggle (auto-saves)
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
  gap: 16
};

const title = {
  fontSize: 22,
  fontWeight: 800
};

const subTitle = {
  fontSize: 16,
  fontWeight: 600
};

const weekRow = {
  display: "flex",
  gap: 8,
  overflowX: "auto"
};

const weekTile = {
  minWidth: 60,
  padding: 10,
  borderRadius: 12,
  textAlign: "center",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
};

const timeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 10
};

const timeBtn = {
  padding: 14,
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 700
};

const hint = {
  fontSize: 12,
  color: "#64748b"
};
