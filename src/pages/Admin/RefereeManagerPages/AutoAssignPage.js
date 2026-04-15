import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

export default function AutoAssignPage() {
  const [step, setStep] = useState(1);
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [refs, setRefs] = useState([]);
  const [games, setGames] = useState([]);

  const [availability, setAvailability] = useState({});
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    loadWeeks();
    loadRefs();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      loadGames();
      loadAvailability();
    }
  }, [selectedWeek]);

  const loadWeeks = async () => {
    const { data } = await supabase
      .from("schedule_master_auto")
      .select("week");

    const unique = [...new Set(data.map((g) => g.week))].sort(
      (a, b) => a - b
    );

    setWeeks(unique);
  };

  const loadRefs = async () => {
    const { data } = await supabase
      .from("referees")
      .select("*")
      .eq("status", "approved");

    setRefs(data || []);
  };

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .eq("week", selectedWeek)
      .ilike("event_type", "%game%");

    setGames(data || []);
  };

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("ref_availability")
      .select("*")
      .eq("week", selectedWeek);

    const map = {};
    data?.forEach((a) => {
      if (!map[a.referee_id]) map[a.referee_id] = {};
      map[a.referee_id][a.time] = a.available;
      map[a.referee_id].coaching = a.is_coaching;
    });

    setAvailability(map);
  };

  const toggleAvailability = (refId, time) => {
    setAvailability((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        [time]: !prev?.[refId]?.[time],
      },
    }));
  };

  const toggleCoaching = (refId) => {
    setAvailability((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        coaching: !prev?.[refId]?.coaching,
      },
    }));
  };

  const saveAvailability = async () => {
    for (let refId in availability) {
      const refData = availability[refId];

      for (let time in refData) {
        if (time === "coaching") continue;

        await supabase.from("ref_availability").upsert({
          referee_id: refId,
          week: selectedWeek,
          time,
          available: refData[time],
          is_coaching: refData.coaching || false,
        });
      }
    }

    alert("Availability Saved");
  };

  const autoAssign = () => {
    const result = [];

    games.forEach((game) => {
      const availableRefs = refs.filter((ref) => {
        const a = availability[ref.id];
        return a?.[game.time] && !a?.coaching;
      });

      result.push({
        gameId: game.id,
        game,
        refs: availableRefs.slice(0, 2),
      });
    });

    setAssignments(result);
    setStep(3);
  };

  const saveAssignments = async () => {
    for (let a of assignments) {
      for (let i = 0; i < a.refs.length; i++) {
        await supabase.from("ref_assignments").insert({
          game_id: a.gameId,
          referee_id: a.refs[i].id,
          role: i === 0 ? "Ref 1" : "Ref 2",
        });
      }
    }

    alert("Assignments Saved!");
  };

  return (
    <div style={wrap}>

      {/* STEP 1 */}
      {step === 1 && (
        <>
          <h2>Select Week</h2>
          <div style={grid}>
            {weeks.map((w) => (
              <div
                key={w}
                style={tile}
                onClick={() => {
                  setSelectedWeek(w);
                  setStep(2);
                }}
              >
                Week {w}
              </div>
            ))}
          </div>
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <h2>Ref Availability - Week {selectedWeek}</h2>

          <div style={grid}>
            {refs.map((ref) => (
              <div key={ref.id} style={card}>
                <div style={name}>
                  {ref.first_name} {ref.last_name}
                </div>

                <div style={timeRow}>
                  {["9:30", "10:30", "11:30", "12:30"].map((t) => (
                    <button
                      key={t}
                      style={{
                        ...timeBtn,
                        background:
                          availability?.[ref.id]?.[t]
                            ? "#16a34a"
                            : "#eee",
                      }}
                      onClick={() => toggleAvailability(ref.id, t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  style={{
                    ...coachBtn,
                    background: availability?.[ref.id]?.coaching
                      ? "#dc2626"
                      : "#ddd",
                  }}
                  onClick={() => toggleCoaching(ref.id)}
                >
                  Coaching
                </button>
              </div>
            ))}
          </div>

          <button onClick={saveAvailability}>Save Availability</button>
          <button onClick={autoAssign}>Auto Assign</button>
        </>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <>
          <h2>Review Assignments</h2>

          {assignments.map((a) => (
            <div key={a.gameId} style={card}>
              <div>
                {a.game.team} vs {a.game.opponent}
              </div>

              {a.refs.map((r, i) => (
                <div key={i}>
                  Ref {i + 1}: {r.first_name}
                </div>
              ))}
            </div>
          ))}

          <button onClick={saveAssignments}>Save Assignments</button>
        </>
      )}
    </div>
  );
}

/* 🔥 STYLES */
const wrap = { padding: 20 };
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: 12,
};
const tile = {
  padding: 16,
  borderRadius: 12,
  background: "#fff",
  cursor: "pointer",
};
const card = {
  padding: 16,
  borderRadius: 12,
  background: "#fff",
};
const name = { fontWeight: 700, marginBottom: 10 };
const timeRow = { display: "flex", gap: 6, marginBottom: 10 };
const timeBtn = {
  padding: 6,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
};
const coachBtn = {
  padding: 6,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
};
