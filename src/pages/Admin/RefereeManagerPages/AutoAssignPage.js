import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

const TIMES = ["9:30", "10:30", "11:30", "12:30"];

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

  /* ---------------- LOAD DATA ---------------- */

  const loadWeeks = async () => {
    const { data } = await supabase
      .from("schedule_master_auto")
      .select("week");

    const unique = [...new Set(data.map((g) => g.week))].sort((a, b) => a - b);
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
      map[a.referee_id][a.time_block] = a.available;
    });

    setAvailability(map);
  };

  /* ---------------- AVAILABILITY ---------------- */

  const toggleAvailability = (refId, time) => {
    setAvailability((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        [time]: !prev?.[refId]?.[time],
      },
    }));
  };

  const saveAvailability = async () => {
    for (let refId in availability) {
      for (let time of TIMES) {
        const { error } = await supabase
          .from("ref_availability")
          .upsert(
            {
              referee_id: refId,
              week: selectedWeek,
              time_block: time, // ✅ FIXED
              available: availability[refId]?.[time] || false,
            },
            {
              onConflict: "referee_id,week,time_block", // ✅ FIXED
            }
          );

        if (error) {
          console.error("Availability save error:", error);
        }
      }
    }

    alert("Availability Saved");
  };

  /* ---------------- AUTO ASSIGN ---------------- */

  const autoAssign = () => {
    let usage = {};

    const result = games.map((game) => {
      const availableRefs = refs
        .filter((ref) => availability?.[ref.id]?.[game.time])
        .sort((a, b) => (usage[a.id] || 0) - (usage[b.id] || 0));

      const selected = availableRefs.slice(0, 2);

      selected.forEach((r) => {
        usage[r.id] = (usage[r.id] || 0) + 1;
      });

      return {
        gameId: game.id,
        game,
        refs: selected,
      };
    });

    setAssignments(result);
    setStep(3);
  };

  /* ---------------- SAVE ASSIGNMENTS ---------------- */

  const saveAssignments = async () => {
    for (let a of assignments) {
      for (let i = 0; i < a.refs.length; i++) {
        const { error } = await supabase
          .from("ref_assignments")
          .upsert(
            {
              game_id: a.gameId,
              referee_id: a.refs[i].id,
              role: i === 0 ? "Ref 1" : "Ref 2",
            },
            {
              onConflict: "game_id,role",
            }
          );

        if (error) {
          console.error("Assignment error:", error);
        }
      }
    }

    alert("Assignments Saved");
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      {/* STEP NAV */}
      <div style={stepGrid}>
        <StepTile label="Week" active={step === 1} onClick={() => setStep(1)} />
        <StepTile label="Availability" active={step === 2} onClick={() => setStep(2)} />
        <StepTile label="Assign" active={step === 3} onClick={() => setStep(3)} />
      </div>

      {/* STEP 1 */}
      {step === 1 && (
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
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <div style={grid}>
            {refs.map((ref) => (
              <div key={ref.id} style={card}>
                <div style={name}>
                  {ref.first_name} {ref.last_name}
                </div>

                <div style={timeRow}>
                  {TIMES.map((t) => (
                    <button
                      key={t}
                      style={{
                        ...timeBtn,
                        background:
                          availability?.[ref.id]?.[t]
                            ? "#16a34a"
                            : "#e5e7eb",
                      }}
                      onClick={() => toggleAvailability(ref.id, t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={actionRow}>
            <button style={primaryBtn} onClick={saveAvailability}>
              Save Availability
            </button>

            <button style={primaryBtn} onClick={autoAssign}>
              Auto Assign
            </button>
          </div>
        </>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <>
          <div style={grid}>
            {assignments.map((a) => (
              <div key={a.gameId} style={card}>
                <div style={name}>
                  {a.game.team} vs {a.game.opponent}
                </div>

                {a.refs.map((r, i) => (
                  <div key={i}>
                    Ref {i + 1}: {r.first_name}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <button style={primaryBtn} onClick={saveAssignments}>
            Save Assignments
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- CLEAN UI ---------------- */

const wrap = { padding: 20 };

const stepGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3,1fr)",
  gap: 10,
  marginBottom: 20,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
  gap: 12,
};

const tile = {
  padding: 16,
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  cursor: "pointer",
  textAlign: "center",
  fontWeight: 700,
};

const card = {
  padding: 16,
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
};

const name = { fontWeight: 700, marginBottom: 10 };

const timeRow = { display: "flex", gap: 6 };

const timeBtn = {
  padding: 6,
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
};

const actionRow = {
  display: "flex",
  gap: 10,
  marginTop: 20,
};

const primaryBtn = {
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer",
};

function StepTile({ label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 12,
        borderRadius: 12,
        background: active ? "#16a34a" : "#fff",
        color: active ? "#fff" : "#111",
        textAlign: "center",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </div>
  );
}
