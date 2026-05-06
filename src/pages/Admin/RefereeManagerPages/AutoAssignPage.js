import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

const TIMES = ["9:30", "10:30", "11:30", "12:30"];

export default function AutoAssignPage() {
  const [step, setStep] = useState(1);
  const [weeks, setWeeks] = useState([]);
  const [weekDates, setWeekDates] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [refs, setRefs] = useState([]);
  const [games, setGames] = useState([]);
  const [availability, setAvailability] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [reviewConflicts, setReviewConflicts] = useState([]);
  const [reviewStatus, setReviewStatus] = useState(null);
  const [savingAssignments, setSavingAssignments] = useState(false);

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
    const cleaned = t
      .toString()
      .replace(/\s+/g, " ")
      .replace(/\s?AM/i, "")
      .replace(/\s?PM/i, "")
      .trim();

    const match = cleaned.match(/^0?(\d{1,2})(?::(\d{1,2}))?/);
    if (!match) return cleaned;

    const hour = String(Number(match[1]));
    const minute = String(Number(match[2] || 0)).padStart(2, "0");
    return `${hour}:${minute}`;
  };

  const getGameTimeOptions = (game) => {
    const times = [
      game.event_time,
      game.time,
      game.starts_at && new Date(game.starts_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    ];

    return [...new Set(times.map(normalizeTime).filter(Boolean))];
  };

  const getGameTime = (game) => {
    return getGameTimeOptions(game)[0] || null;
  };

  const isRefAvailableForGame = (refId, game) => {
    const refAvailability = availability?.[refId];
    if (!refAvailability) return false;

    const gameTimes = getGameTimeOptions(game);
    if (!gameTimes.length) return false;

    return gameTimes.some((gameTime) => (
      Object.entries(refAvailability).some(([timeBlock, isAvailable]) => (
        isAvailable === true && normalizeTime(timeBlock) === gameTime
      ))
    ));
  };

  const getAvailabilityCount = (game) => {
    return refs.filter((ref) => isRefAvailableForGame(ref.id, game)).length;
  };

  const getPrimaryGameTime = (game) => {
    if (game.event_time || game.time) {
      return normalizeTime(game.event_time || game.time);
    }

    if (game.starts_at) {
      return normalizeTime(new Date(game.starts_at).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }));
    }

    return null;
  };

  const isRefAvailable = (refId, gameTime) => {
    if (!gameTime) return false;
    return availability?.[refId]?.[gameTime] === true;
  };

  const parseDate = (date) => {
    if (!date) return null;
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDateRange = (dates) => {
    if (!dates?.length) return "";

    const sorted = dates
      .map(parseDate)
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!sorted.length) return "";

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (first.toDateString() === last.toDateString()) {
      return formatDate(first);
    }

    return `${formatDate(first)} - ${formatDate(last)}`;
  };

  /* ---------------- LOAD ---------------- */

  // 🔥 FIXED WEEKS (NOW INCLUDES WEEK 8)
  const loadWeeks = async () => {
    const { data } = await supabase
      .from("schedule_master_auto")
      .select("week,event_date,event_type");

    const fullWeeks = [1, 2, 3, 4, 5, 6, 7, 8, "Championship"];
    const dateMap = {};

    (data || []).forEach((game) => {
      const eventType = game.event_type?.toLowerCase() || "";
      if (!eventType.includes("game") && !eventType.includes("champ")) return;

      const key = game.event_type?.toLowerCase().includes("champ")
        ? "Championship"
        : game.week;

      if (!key || !fullWeeks.includes(key)) return;
      if (!dateMap[key]) dateMap[key] = [];
      if (game.event_date) dateMap[key].push(game.event_date);
    });

    setWeeks(fullWeeks);
    setWeekDates(dateMap);
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
    setAvailabilityStatus(null);
    setAvailability((prev) => ({
      ...prev,
      [refId]: {
        ...prev[refId],
        [time]: !prev?.[refId]?.[time],
      },
    }));
  };

  const saveAvailability = async () => {
    setSavingAvailability(true);
    setAvailabilityStatus(null);

    const errors = [];

    for (let refId in availability) {
      for (let time of TIMES) {
        const { error } = await supabase.from("ref_availability").upsert(
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

        if (error) {
          console.error("Availability save error:", error);
          errors.push(error);
        }
      }
    }

    setSavingAvailability(false);

    if (errors.length) {
      setAvailabilityStatus({
        type: "error",
        message: "Availability could not be saved. Check the console for details.",
      });
      return;
    }

    setAvailabilityStatus({
      type: "success",
      message: "Availability saved. Ready to assign refs.",
    });

    setStep(3);
  };

  const autoAssign = () => {
    const usage = {};
    const assignedByTime = {};

    const result = games.map((game) => ({
      gameId: game.id,
      game,
      refs: [],
      availableCount: getAvailabilityCount(game),
    }));

    const assignSlot = (assignment, slot) => {
      const gameTime = getPrimaryGameTime(assignment.game);
      if (!gameTime) return;

      if (!assignedByTime[gameTime]) {
        assignedByTime[gameTime] = new Set();
      }

      const selectedIds = new Set(assignment.refs.map((ref) => ref.id));
      const ref = refs
        .filter((candidate) => (
          isRefAvailableForGame(candidate.id, assignment.game) &&
          !assignedByTime[gameTime].has(candidate.id) &&
          !selectedIds.has(candidate.id)
        ))
        .sort((a, b) => {
          const usageDiff = (usage[a.id] || 0) - (usage[b.id] || 0);
          if (usageDiff !== 0) return usageDiff;

          const nameA = `${a.first_name || ""} ${a.last_name || ""}`;
          const nameB = `${b.first_name || ""} ${b.last_name || ""}`;
          return nameA.localeCompare(nameB);
        })[0];

      if (!ref) return;

      assignment.refs[slot] = ref;
      usage[ref.id] = (usage[ref.id] || 0) + 1;
      assignedByTime[gameTime].add(ref.id);
    };

    result.forEach((assignment) => assignSlot(assignment, 0));
    result.forEach((assignment) => assignSlot(assignment, 1));

    setAssignments(result);
    setStep(4);
  };

  const saveAssignments = async () => {
    setReviewStatus(null);

    const conflicts = getDoubleCoverageConflicts(assignments);
    setReviewConflicts(conflicts);

    if (conflicts.length) {
      setReviewStatus({
        type: "error",
        message: "Fix double coverage before saving assignments.",
      });
      return;
    }

    setSavingAssignments(true);
    const errors = [];

    for (let a of assignments) {
      for (let i = 0; i < 2; i++) {
        const ref = a.refs[i] || null;

        const { error } = await supabase
          .from("ref_assignments")
          .upsert(
            {
              game_id: a.gameId,
              referee_id: ref?.id || null,
              role: i === 0 ? "Ref 1" : "Ref 2",
            },
            {
              onConflict: "game_id,role",
            }
          );

        if (error) {
          console.error("Assignment save error:", error);
          errors.push(error);
        }
      }
    }

    if (errors.length) {
      setSavingAssignments(false);
      setReviewStatus({
        type: "error",
        message: "Some assignments could not be saved. Check the console for details.",
      });
      return;
    }

    setSavingAssignments(false);
    setReviewStatus({
      type: "success",
      message: "Assignments saved successfully.",
    });
  };

  const updateReviewRef = (assignmentIndex, slot, refId) => {
    setReviewConflicts([]);
    setReviewStatus(null);
    setAssignments((prev) => prev.map((assignment, index) => {
      if (index !== assignmentIndex) return assignment;

      const nextRefs = [...assignment.refs];
      nextRefs[slot] = refs.find((ref) => ref.id === refId) || null;

      return {
        ...assignment,
        refs: nextRefs,
      };
    }));
  };

  const getAssignedCount = (assignment) => (
    [0, 1].filter((slot) => assignment.refs[slot]).length
  );

  const getGameLabel = (game) => (
    `${game.team || "Team"} vs ${game.opponent || "Opponent"}`
  );

  const getDoubleCoverageConflicts = (items) => {
    const map = {};

    items.forEach((assignment) => {
      const gameTime = getPrimaryGameTime(assignment.game);
      if (!gameTime) return;

      [0, 1].forEach((slot) => {
        const ref = assignment.refs[slot];
        if (!ref) return;

        const key = `${ref.id}-${gameTime}`;
        if (!map[key]) {
          map[key] = {
            refName: `${ref.first_name || ""} ${ref.last_name || ""}`.trim(),
            time: gameTime,
            games: [],
          };
        }

        map[key].games.push({
          role: slot === 0 ? "Ref 1" : "Ref 2",
          label: getGameLabel(assignment.game),
        });
      });
    });

    return Object.values(map).filter((entry) => entry.games.length > 1);
  };

  const runReviewCheck = () => {
    const conflicts = getDoubleCoverageConflicts(assignments);
    setReviewConflicts(conflicts);
    setReviewStatus({
      type: conflicts.length ? "error" : "success",
      message: conflicts.length
        ? "Double coverage found. Fix these before saving."
        : "No double coverage found.",
    });
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
              <div>{typeof w === "number" ? `Week ${w}` : w}</div>
              <div style={weekDateText}>
                {formatDateRange(weekDates[w]) || "No games scheduled"}
              </div>
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
            <button
              style={{
                ...primaryBtn,
                opacity: savingAvailability ? 0.65 : 1,
                cursor: savingAvailability ? "not-allowed" : "pointer",
              }}
              onClick={saveAvailability}
              disabled={savingAvailability}
            >
              {savingAvailability ? "Saving..." : "Save Availability"}
            </button>

            {availabilityStatus && (
              <div
                style={{
                  ...statusPill,
                  ...(availabilityStatus.type === "error" ? errorPill : successPill),
                }}
              >
                {availabilityStatus.message}
              </div>
            )}
          </div>
        </>
      )}

      {step === 3 && (
        <div style={centerBox}>
          <h2>Auto Assign Referees</h2>
          {availabilityStatus?.type === "success" && (
            <div style={{ ...statusPill, ...successPill }}>
              {availabilityStatus.message}
            </div>
          )}
          <button style={primaryBtn} onClick={autoAssign}>
            Run Auto Assign
          </button>
        </div>
      )}

      {step === 4 && (
        <>
          <div style={grid}>
            {assignments.map((a, assignmentIndex) => (
              <div key={a.gameId} style={card}>
                <div style={gameTitle}>
                  {a.game.team} vs {a.game.opponent}
                </div>

                <div style={gameMeta}>
                  {a.game.division} • {getGameTime(a.game) || "No time"} •{" "}
                  {a.availableCount} available
                </div>
                <div style={timeMatchMeta}>
                  Checked: {getGameTimeOptions(a.game).join(", ") || "No time found"}
                </div>

                <div style={{ marginTop: 10 }}>
                  {[0, 1].map((slot) => {
                    const ref = a.refs[slot];
                    const selectedOtherSlot = a.refs[slot === 0 ? 1 : 0]?.id;

                    return (
                      <div key={slot} style={reviewSlotRow}>
                        <label style={reviewSlotLabel}>Ref {slot + 1}</label>
                        <select
                          style={reviewSelect}
                          value={ref?.id || ""}
                          onChange={(event) => updateReviewRef(assignmentIndex, slot, event.target.value)}
                        >
                          <option value="">Not Assigned</option>
                          {refs.map((optionRef) => {
                            const unavailable = !isRefAvailableForGame(optionRef.id, a.game);
                            const alreadyOnGame = selectedOtherSlot === optionRef.id;
                            const label = `${optionRef.first_name} ${optionRef.last_name}${
                              unavailable ? " - unavailable" : ""
                            }${alreadyOnGame ? " - already on game" : ""}`;

                            return (
                              <option
                                key={optionRef.id}
                                value={optionRef.id}
                                disabled={alreadyOnGame}
                              >
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  })}

                  {getAssignedCount(a) < 2 && (
                    <div style={warningText}>
                      Not enough available refs for this game
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={actionRow}>
            <button style={secondaryBtn} onClick={runReviewCheck}>
              Check Double Coverage
            </button>
            <button
              style={{
                ...primaryBtn,
                opacity: savingAssignments ? 0.65 : 1,
                cursor: savingAssignments ? "not-allowed" : "pointer",
              }}
              onClick={saveAssignments}
              disabled={savingAssignments}
            >
              {savingAssignments ? "Saving..." : "Approve & Save"}
            </button>

            {reviewStatus && (
              <div
                style={{
                  ...statusPill,
                  ...(reviewStatus.type === "error" ? errorPill : successPill),
                }}
              >
                {reviewStatus.message}
              </div>
            )}
          </div>

          {reviewConflicts.length > 0 && (
            <div style={conflictBox}>
              <div style={conflictTitle}>Double coverage found. Fix these before saving.</div>
              {reviewConflicts.map((conflict) => (
                <div key={`${conflict.refName}-${conflict.time}`} style={conflictItem}>
                  <strong>{conflict.refName}</strong> is assigned at <strong>{conflict.time}</strong> for{" "}
                  {conflict.games.map((game) => `${game.label} (${game.role})`).join(" and ")}.
                </div>
              ))}
            </div>
          )}
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
const weekDateText = { color: "#64748b", fontSize: 12, fontWeight: 600, marginTop: 6 };
const card = { padding: 16, borderRadius: 16, background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" };
const name = { fontWeight: 700, marginBottom: 10 };
const timeRow = { display: "flex", gap: 6 };
const timeBtn = { padding: 6, borderRadius: 6, border: "none", cursor: "pointer" };
const actionRow = { display: "flex", gap: 10, marginTop: 20, alignItems: "center", flexWrap: "wrap" };
const primaryBtn = { padding: 10, borderRadius: 10, border: "none", background: "#16a34a", color: "#fff", cursor: "pointer" };
const secondaryBtn = { padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", cursor: "pointer" };
const centerBox = { display: "flex", flexDirection: "column", alignItems: "center", gap: 20, marginTop: 40 };
const gameTitle = { fontWeight: 700 };
const gameMeta = { fontSize: 12, color: "#64748b" };
const timeMatchMeta = { fontSize: 11, color: "#94a3b8", marginTop: 4 };
const unassignedText = { color: "#dc2626", fontWeight: 700 };
const warningText = { color: "#dc2626", marginTop: 8, fontSize: 12, fontWeight: 700 };
const reviewSlotRow = { display: "grid", gridTemplateColumns: "52px 1fr", gap: 8, alignItems: "center", marginTop: 8 };
const reviewSlotLabel = { fontSize: 12, color: "#475569", fontWeight: 700 };
const reviewSelect = { width: "100%", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc" };
const statusPill = { padding: "9px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700 };
const successPill = { background: "#dcfce7", color: "#166534" };
const errorPill = { background: "#fee2e2", color: "#991b1b" };
const conflictBox = { marginTop: 14, padding: 14, borderRadius: 10, background: "#fee2e2", color: "#991b1b" };
const conflictTitle = { fontWeight: 800, marginBottom: 8 };
const conflictItem = { fontSize: 13, marginTop: 6 };

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
