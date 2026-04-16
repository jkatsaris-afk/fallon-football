import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const TIMES = ["9:30", "10:30", "11:30", "12:30"];

const normalizeTime = (t) => {
  if (!t) return null;
  return t.toString().replace(" AM", "").replace(" PM", "").trim();
};

export default function RefAvailabilityPage() {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [refId, setRefId] = useState(null);
  const [availability, setAvailability] = useState({});

  const [touchStart, setTouchStart] = useState(null);

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
    if (!selectedWeek && unique.length) setSelectedWeek(unique[0]);
  };

  const getRefId = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return;

    const { data } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle();

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
      map[normalizeTime(a.time_block)] = a.available;
    });

    setAvailability(map);
  };

  /* ---------------- TOGGLE ---------------- */

  const toggle = async (time) => {
    if (!refId || !selectedWeek) return;

    const current = availability?.[time];
    const newValue = current === undefined ? true : !current;

    setAvailability((prev) => ({
      ...prev,
      [time]: newValue,
    }));

    await supabase.from("ref_availability").upsert(
      [
        {
          referee_id: refId,
          week: selectedWeek,
          time_block: normalizeTime(time),
          available: newValue,
        },
      ],
      {
        onConflict: ["referee_id", "week", "time_block"],
      }
    );
  };

  /* ---------------- BULK ACTIONS ---------------- */

  const setAll = async (value) => {
    const updates = {};

    TIMES.forEach((t) => {
      updates[t] = value;
    });

    setAvailability(updates);

    for (let t of TIMES) {
      await supabase.from("ref_availability").upsert(
        [
          {
            referee_id: refId,
            week: selectedWeek,
            time_block: t,
            available: value,
          },
        ],
        {
          onConflict: ["referee_id", "week", "time_block"],
        }
      );
    }
  };

  /* ---------------- SWIPE ---------------- */

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;

    const diff = touchStart - e.changedTouches[0].clientX;

    const currentIndex = weeks.indexOf(selectedWeek);

    if (diff > 50 && currentIndex < weeks.length - 1) {
      setSelectedWeek(weeks[currentIndex + 1]); // swipe left
    }

    if (diff < -50 && currentIndex > 0) {
      setSelectedWeek(weeks[currentIndex - 1]); // swipe right
    }
  };

  /* ---------------- STATS ---------------- */

  const totalSet = Object.keys(availability).length;
  const totalAvailable = Object.values(availability).filter(v => v === true).length;

  /* ---------------- UI ---------------- */

  return (
    <div
      style={wrap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      <div style={header}>My Availability</div>

      {/* STATS */}
      <div style={statsGrid}>
        <StatTile label="Set" value={totalSet} />
        <StatTile label="Available" value={totalAvailable} />
      </div>

      {/* WEEK */}
      <div style={weekRow}>
        {weeks.map((w) => (
          <div
            key={w}
            style={{
              ...weekTile,
              ...(selectedWeek === w && activeTile),
            }}
            onClick={() => setSelectedWeek(w)}
          >
            Week {w}
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS */}
      {selectedWeek && (
        <div style={actionRow}>
          <button style={greenBtn} onClick={() => setAll(true)}>
            All Available
          </button>
          <button style={redBtn} onClick={() => setAll(false)}>
            Clear All
          </button>
        </div>
      )}

      {/* TIMES */}
      {selectedWeek && (
        <div style={timeGrid}>
          {TIMES.map((t) => {
            const value = availability?.[t];

            let style = { ...timeTile };

            if (value === true) style = { ...style, ...greenTile };
            if (value === false) style = { ...style, ...redTile };

            return (
              <div
                key={t}
                style={style}
                onClick={() => toggle(t)}
              >
                {t}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function StatTile({ label, value }) {
  return (
    <div style={statCard}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const wrap = {
  padding: 16,
  maxWidth: 700,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 16
};

const header = {
  fontSize: 24,
  fontWeight: 800,
  textAlign: "center"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 10
};

const statCard = {
  background: "#fff",
  padding: 16,
  borderRadius: 16,
  textAlign: "center",
  boxShadow: "0 6px 20px rgba(0,0,0,0.08)"
};

const statValue = {
  fontSize: 22,
  fontWeight: 800,
  color: "#16a34a"
};

const statLabel = {
  fontSize: 12,
  color: "#64748b"
};

const weekRow = {
  display: "flex",
  gap: 8,
  overflowX: "auto"
};

const weekTile = {
  padding: 10,
  borderRadius: 12,
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const activeTile = {
  boxShadow: "0 0 0 2px #16a34a inset"
};

const actionRow = {
  display: "flex",
  gap: 10
};

const greenBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none"
};

const redBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  background: "#dc2626",
  color: "#fff",
  border: "none"
};

const timeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 12
};

const timeTile = {
  padding: 24,
  borderRadius: 18,
  textAlign: "center",
  fontWeight: 800,
  background: "#f1f5f9",
  cursor: "pointer",
  transition: "0.15s"
};

const greenTile = {
  background: "#16a34a",
  color: "#fff",
  boxShadow: "0 0 12px rgba(22,163,74,0.5)"
};

const redTile = {
  background: "#dc2626",
  color: "#fff",
  boxShadow: "0 0 12px rgba(220,38,38,0.5)"
};
