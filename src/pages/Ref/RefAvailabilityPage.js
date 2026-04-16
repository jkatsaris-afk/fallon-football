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
      const time = normalizeTime(a.time_block);
      map[time] = a.available;
    });

    setAvailability(map);
  };

  /* ---------------- TOGGLE ---------------- */

  const toggle = async (time) => {
    if (!refId || !selectedWeek) return;

    const current = availability?.[time];

    let newValue;
    if (current === undefined) newValue = true;
    else newValue = !current;

    setAvailability((prev) => ({
      ...prev,
      [time]: newValue,
    }));

    await supabase
      .from("ref_availability")
      .upsert(
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

  /* ---------------- STATS ---------------- */

  const totalSet = Object.keys(availability).length;
  const totalAvailable = Object.values(availability).filter(v => v === true).length;

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      {/* HEADER */}
      <div style={header}>My Availability</div>

      {/* STATS */}
      <div style={statsGrid}>
        <StatTile label="Set Slots" value={totalSet} />
        <StatTile label="Available" value={totalAvailable} />
      </div>

      {/* WEEK SELECT */}
      <div style={weekGrid}>
        {weeks.map((w) => (
          <div
            key={w}
            style={{
              ...weekCard,
              border: selectedWeek === w ? "2px solid #16a34a" : "2px solid transparent",
            }}
            onClick={() => setSelectedWeek(w)}
          >
            Week {w}
          </div>
        ))}
      </div>

      {/* TIME BLOCKS */}
      {selectedWeek && (
        <div style={timeGrid}>
          {TIMES.map((t) => {
            const value = availability?.[t];

            let bg = "#f1f5f9"; // cleaner gray
            let color = "#111";

            if (value === true) {
              bg = "#16a34a";
              color = "#fff";
            } else if (value === false) {
              bg = "#dc2626";
              color = "#fff";
            }

            return (
              <div
                key={t}
                style={{
                  ...timeCard,
                  background: bg,
                  color: color,
                }}
                onClick={() => toggle(t)}
              >
                <div style={timeText}>{t}</div>
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
  gap: 12
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

const weekGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
  gap: 10
};

const weekCard = {
  padding: 14,
  borderRadius: 14,
  background: "#fff",
  textAlign: "center",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};

const timeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 12
};

const timeCard = {
  padding: 22,
  borderRadius: 18,
  textAlign: "center",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
};

const timeText = {
  fontSize: 18
};
