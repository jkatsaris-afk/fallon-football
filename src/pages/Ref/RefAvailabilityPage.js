import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const TIMES = ["9:30", "10:30", "11:30", "12:30"];

const normalizeTime = (t) => {
  if (!t) return null;
  return t.toString().replace(" AM", "").replace(" PM", "").trim();
};

export default function RefAvailabilityPage({ user }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [refId, setRefId] = useState(null);
  const [availability, setAvailability] = useState({});

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    console.log("USER:", user);
    loadWeeks();
    getRefId();
  }, []);

  useEffect(() => {
    console.log("refId:", refId, "week:", selectedWeek);
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
      console.error("Weeks error:", error);
      return;
    }

    const unique = [...new Set(data.map((g) => g.week))].sort((a, b) => a - b);
    console.log("WEEKS:", unique);

    setWeeks(unique);
  };

  const getRefId = async () => {
    if (!user?.id) {
      console.warn("NO USER ID");
      return;
    }

    const { data, error } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle(); // 🔥 safer

    console.log("REF LOOKUP:", data);

    if (error) {
      console.error("Ref lookup error:", error);
      return;
    }

    if (!data) {
      console.warn("NO REF FOUND FOR USER");
      return;
    }

    setRefId(data.id);
  };

  const loadAvailability = async () => {
    console.log("LOADING AVAILABILITY FOR:", refId, selectedWeek);

    const { data, error } = await supabase
      .from("ref_availability")
      .select("*")
      .eq("referee_id", refId)
      .eq("week", selectedWeek);

    console.log("AVAIL DATA:", data);

    if (error) {
      console.error("Availability error:", error);
      return;
    }

    const map = {};

    data?.forEach((a) => {
      const time = normalizeTime(a.time_block);
      map[time] = a.available;
    });

    setAvailability(map);
  };

  /* ---------------- TOGGLE ---------------- */

  const toggle = async (time) => {
    console.log("CLICK:", time);

    if (!refId || !selectedWeek) {
      console.warn("BLOCKED CLICK - missing refId or week");
      return;
    }

    const current = availability?.[time];

    let newValue;
    if (current === undefined) newValue = true;
    else newValue = !current;

    console.log("NEW VALUE:", newValue);

    setAvailability((prev) => ({
      ...prev,
      [time]: newValue,
    }));

    const { error } = await supabase
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
      )
      .select();

    if (error) {
      console.error("SAVE ERROR:", error);
    } else {
      console.log("SAVE SUCCESS");
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>
      <div style={title}>My Availability</div>

      <div style={weekRow}>
        {weeks.map((w) => (
          <div
            key={w}
            style={{
              ...weekTile,
              background: selectedWeek === w ? "#16a34a" : "#fff",
              color: selectedWeek === w ? "#fff" : "#111",
            }}
            onClick={() => {
              console.log("SELECT WEEK:", w);
              setSelectedWeek(w);
            }}
          >
            W{w}
          </div>
        ))}
      </div>

      {selectedWeek && (
        <div style={timeGrid}>
          {TIMES.map((t) => {
            const value = availability?.[t];

            let bg = "#e5e7eb";
            let color = "#111";

            if (value === true) {
              bg = "#16a34a";
              color = "#fff";
            } else if (value === false) {
              bg = "#dc2626";
              color = "#fff";
            }

            return (
              <button
                key={t}
                style={{ ...timeBtn, background: bg, color }}
                onClick={() => toggle(t)}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const wrap = { padding: 20 };
const title = { fontSize: 22, fontWeight: 800 };
const weekRow = { display: "flex", gap: 8 };
const weekTile = {
  padding: 10,
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 700,
};
const timeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4,1fr)",
  gap: 10,
  marginTop: 20,
};
const timeBtn = {
  padding: 14,
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
};
