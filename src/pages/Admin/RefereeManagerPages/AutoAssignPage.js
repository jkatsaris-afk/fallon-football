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

  /* ---------------- TIME FIX ---------------- */

  const normalizeTime = (t) => {
    if (!t) return null;
    return t.toString().replace(" AM", "").replace(" PM", "").trim();
  };

  /* ---------------- LOAD ---------------- */

  // 🔥 FIXED WEEKS (NOW INCLUDES WEEK 8)
  const loadWeeks = async () => {
    const { data } = await supabase
      .from("schedule_master_auto")
      .select("week");

    const dbWeeks = [...new Set((data || []).map((g) => g.week))];

    const fullWeeks = [1, 2, 3, 4, 5, 6, 7, 8, "Championship"];

    setWeeks(fullWeeks);
  };

  const loadRefs = async () => {
    const { data } = await supabase
      .from("referees")
      .select("*")
      .eq("status", "approved");

    setRefs(data || []);
  };

  const loadGames = async () => {
    let query = supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%game%");

    if (selectedWeek === "Championship") {
      query = query.ilike("event_type", "%champ%");
    } else {
      query = query.eq("week", selectedWeek);
    }

    const { data } = await query;

    setGames(data || []);
  };

  const loadAvailability = async () => {
    let query = supabase
      .from("ref_availability")
      .select("*");

    if (selectedWeek === "Championship") {
      query = query.eq("week", 9); // 👈 Championship now moved to week 9
    } else {
      query = query.eq("week", selectedWeek);
    }

    const { data } = await query;

    const map = {};

    data?.forEach((a) => {
      if (!map[a.referee_id]) map[a.referee_id] = {};
      map[a.referee_id][normalizeTime(a.time_block)] = a.available;
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

  const saveAvailability = async () => {
    for (let refId in availability) {
      for (let time of TIMES) {
        await supabase.from("ref_availability").upsert(
          {
            referee_id: refId,
            week: selectedWeek === "Championship" ? 9 : selectedWeek,
            time_block: time,
            available: availability[refId]?.[time] || false,
          },
          {
            onConflict: "referee_id,week,time_block",
          }
        );
      }
    }

    alert("Availability Saved");
    setStep(3);
  };

  const autoAssign = () => {
    let usage = {};

    const result = games.map((game) => {
      const gameTime = normalizeTime(game.event_time);

      const availableRefs = refs
        .filter((ref) => {
          const a = availability[ref.id];

          if (!a) return true;
          if (a[gameTime] === undefined) return true;

          return a[gameTime] === true;
        })
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
    setStep(4);
  };

  const saveAssignments = async () => {
    for (let a of assignments) {
      for (let i = 0; i < a.refs.length; i++) {
        const ref = a.refs[i];

        const { error } = await supabase
          .from("ref_assignments")
          .upsert(
            {
              game_id: a.gameId,
              referee_id: ref.id,
              role: i === 0 ? "Ref 1" : "Ref 2",
            },
            {
              onConflict: "game_id,role",
            }
          );

        if (error) {
          console.error("Assignment save error:", error);
        }
      }
    }

    alert("Assignments Saved!");
  };

  return (
    <div style={wrap}>
      <div style={stepGrid}>
        <StepTile label="Week" active={step === 1} onClick={() => setStep(1)} />
        <StepTile label="Availability" active={step === 2} onClick={() => setStep(2)} />
        <StepTile label="Assign" active={step === 3} onClick={() => setStep(3)} />
        <StepTile label="Review" active={step === 4} onClick={() => setStep(4)} />
      </div>

      {step === 1 && (
        <div style={grid}>
          {weeks.map((w) => (
            <div key={w} style={tile} onClick={() => { setSelectedWeek(w); setStep(2); }}>
              {typeof w === "number" ? `Week ${w}` : w}
            </div>
          ))}
        </div>
      )}

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
          </div>
        </>
      )}

      {step === 3 && (
        <div style={centerBox}>
          <h2>Auto Assign Referees</h2>
          <button style={primaryBtn} onClick={autoAssign}>
            Run Auto Assign
          </button>
        </div>
      )}

      {step === 4 && (
        <>
          <div style={grid}>
            {assignments.map((a) => (
              <div key={a.gameId} style={card}>
                <div style={gameTitle}>
                  {a.game.team} vs {a.game.opponent}
                </div>

                <div style={gameMeta}>
                  {a.game.division} • {a.game.event_time}
                </div>

                <div style={{ marginTop: 10 }}>
                  {a.refs.length === 0 && (
                    <div style={{ color: "red" }}>
                      ⚠️ No refs available
                    </div>
                  )}

                  {a.refs.map((r, i) => (
                    <div key={i}>
                      Ref {i + 1}: {r.first_name} {r.last_name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={actionRow}>
            <button style={primaryBtn} onClick={saveAssignments}>
              Approve & Save
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* STYLES (UNCHANGED) */

const wrap = { padding: 20 };
const stepGrid = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 };
const tile = { padding: 16, borderRadius: 16, background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.08)", cursor: "pointer", textAlign: "center", fontWeight: 700 };
const card = { padding: 16, borderRadius: 16, background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" };
const name = { fontWeight: 700, marginBottom: 10 };
const timeRow = { display: "flex", gap: 6 };
const timeBtn = { padding: 6, borderRadius: 6, border: "none", cursor: "pointer" };
const actionRow = { display: "flex", gap: 10, marginTop: 20 };
const primaryBtn = { padding: 10, borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer" };
const centerBox = { display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: 40 };
const gameTitle = { fontWeight: 700 };
const gameMeta = { fontSize: 12, color: "#64748b" };

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
