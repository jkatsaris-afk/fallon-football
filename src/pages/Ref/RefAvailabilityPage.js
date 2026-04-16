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

  /* ---------------- BULK ---------------- */

  const setAll = async (value) => {
    const updates = {};
    TIMES.forEach((t) => (updates[t] = value));
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

  /* ---------------- NAV ---------------- */

  const currentIndex = weeks.indexOf(selectedWeek);

  const prevWeek = () => {
    if (currentIndex > 0) setSelectedWeek(weeks[currentIndex - 1]);
  };

  const nextWeek = () => {
    if (currentIndex < weeks.length - 1) setSelectedWeek(weeks[currentIndex + 1]);
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      <div style={header}>My Availability</div>

      {/* WEEK TILE NAV */}
      <div style={weekTileWrap}>

        <div style={arrowBtn} onClick={prevWeek}>‹</div>

        <div style={weekTile}>
          <div style={weekLabel}>Week</div>
          <div style={weekNumber}>{selectedWeek}</div>
        </div>

        <div style={arrowBtn} onClick={nextWeek}>›</div>

      </div>

      {/* ACTIONS */}
      <div style={actionRow}>
        <button style={greenBtn} onClick={() => setAll(true)}>
          All Available
        </button>
        <button style={redBtn} onClick={() => setAll(false)}>
          All Unavailable
        </button>
      </div>

      {/* TIME TILES */}
      <div style={timeGrid}>
        {TIMES.map((t) => {
          const value = availability?.[t];

          let style = { ...timeTile };

          if (value === true) style = { ...style, ...greenTile };
          if (value === false) style = { ...style, ...redTile };

          return (
            <div key={t} style={style} onClick={() => toggle(t)}>
              {t}
            </div>
          );
        })}
      </div>

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

/* WEEK TILE NAV */
const weekTileWrap = {
  display: "flex",
  alignItems: "center",
  gap: 10
};

const arrowBtn = {
  width: 50,
  height: 50,
  borderRadius: 14,
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};

const weekTile = {
  flex: 1,
  background: "#fff",
  borderRadius: 18,
  padding: 16,
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const weekLabel = {
  fontSize: 12,
  color: "#64748b"
};

const weekNumber = {
  fontSize: 22,
  fontWeight: 800
};

/* ACTIONS */
const actionRow = {
  display: "flex",
  gap: 10
};

const greenBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  background: "#22c55e",
  color: "#fff",
  border: "none"
};

const redBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 10,
  background: "#f87171",
  color: "#fff",
  border: "none"
};

/* TIME GRID */
const timeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 12
};

/* 🔥 KEY FIX HERE */
const timeTile = {
  padding: 26,
  borderRadius: 18,
  textAlign: "center",
  fontWeight: 800,
  background: "#ffffff",
  border: "2px solid #e2e8f0", // 👈 OUTLINE FIX
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)", // 👈 subtle depth
  cursor: "pointer",
  transition: "all 0.15s ease"
};

const greenTile = {
  background: "#bbf7d0",
  color: "#166534",
  border: "2px solid #86efac",
  boxShadow: "0 6px 16px rgba(34,197,94,0.2)"
};

const redTile = {
  background: "#fecaca",
  color: "#7f1d1d",
  border: "2px solid #fca5a5",
  boxShadow: "0 6px 16px rgba(248,113,113,0.2)"
};
