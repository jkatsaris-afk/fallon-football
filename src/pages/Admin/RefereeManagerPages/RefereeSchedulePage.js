import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

export default function RefereeSchedulePage() {
  const [games, setGames] = useState([]);
  const [refs, setRefs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedRefs, setSelectedRefs] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setLoading(true);
    setMessage("");

    const [gamesRes, refsRes, assignmentsRes] = await Promise.all([
      supabase
        .from("schedule_master_auto")
        .select("*")
        .ilike("event_type", "%game%")
        .order("week", { ascending: true })
        .order("event_date", { ascending: true })
        .order("time", { ascending: true }),

      supabase
        .from("referees")
        .select("*")
        .eq("status", "approved")
        .order("first_name", { ascending: true }),

      supabase
        .from("ref_assignments")
        .select("*, referees(*)"),
    ]);

    if (gamesRes.error) {
      console.error("Error loading games:", gamesRes.error);
    }

    if (refsRes.error) {
      console.error("Error loading referees:", refsRes.error);
    }

    if (assignmentsRes.error) {
      console.error("Error loading assignments:", assignmentsRes.error);
    }

    setGames(gamesRes.data || []);
    setRefs(refsRes.data || []);
    setAssignments(assignmentsRes.data || []);
    setLoading(false);
  };

  const assignmentMap = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (a.schedule_id) {
        map[a.schedule_id] = a;
      }
    });
    return map;
  }, [assignments]);

  const stats = useMemo(() => {
    const assigned = games.filter((g) => assignmentMap[g.id]).length;
    const unassigned = games.length - assigned;

    return {
      total: games.length,
      assigned,
      unassigned,
    };
  }, [games, assignmentMap]);

  const filteredGames = useMemo(() => {
    if (filter === "assigned") {
      return games.filter((g) => assignmentMap[g.id]);
    }

    if (filter === "unassigned") {
      return games.filter((g) => !assignmentMap[g.id]);
    }

    return games;
  }, [games, filter, assignmentMap]);

  const getRefName = (ref) =>
    `${ref?.first_name || ""} ${ref?.last_name || ""}`.trim() || "Unnamed Ref";

  const getGameTitle = (game) => {
    const team = game.team || "TBD";
    const opponent = game.opponent || "TBD";
    return `${team} vs ${opponent}`;
  };

  const getAssignmentForGame = (gameId) => {
    return assignmentMap[gameId] || null;
  };

  const isRefBusyAtGameTime = (refId, game) => {
    return assignments.some((a) => {
      if (a.referee_id !== refId) return false;
      if (a.schedule_id === game.id) return false;

      const assignedGame = games.find((g) => g.id === a.schedule_id);
      if (!assignedGame) return false;

      return (
        assignedGame.event_date === game.event_date &&
        assignedGame.time === game.time
      );
    });
  };

  const getAvailableRefsForGame = (game) => {
    return refs.filter((ref) => !isRefBusyAtGameTime(ref.id, game));
  };

  const assignRefToGame = async (game) => {
    const refereeId = selectedRefs[game.id];
    if (!refereeId) return;

    setSavingId(game.id);
    setMessage("");

    const currentAssignment = getAssignmentForGame(game.id);

    const isBusy = assignments.some((a) => {
      if (a.referee_id !== refereeId) return false;
      if (currentAssignment && a.id === currentAssignment.id) return false;

      const assignedGame = games.find((g) => g.id === a.schedule_id);
      if (!assignedGame) return false;

      return (
        assignedGame.event_date === game.event_date &&
        assignedGame.time === game.time
      );
    });

    if (isBusy) {
      setMessage("That referee is already assigned to another game at that time.");
      setSavingId(null);
      return;
    }

    let error = null;

    if (currentAssignment) {
      const updateRes = await supabase
        .from("ref_assignments")
        .update({ referee_id: refereeId })
        .eq("id", currentAssignment.id);

      error = updateRes.error;
    } else {
      const insertRes = await supabase.from("ref_assignments").insert({
        schedule_id: game.id,
        referee_id: refereeId,
        assigned_role: "ref",
        status: "assigned",
      });

      error = insertRes.error;
    }

    if (error) {
      console.error("Error assigning ref:", error);
      setMessage("Could not assign referee.");
      setSavingId(null);
      return;
    }

    setMessage("Referee assignment updated.");
    await loadPageData();
    setSavingId(null);
  };

  const autoAssignOpenGames = async () => {
    setLoading(true);
    setMessage("");

    const openGames = games.filter((g) => !assignmentMap[g.id]);

    if (!openGames.length) {
      setMessage("No open games to assign.");
      setLoading(false);
      return;
    }

    const workingAssignments = [...assignments];
    let assignedCount = 0;

    for (const game of openGames) {
      const availableRef = refs.find((ref) => {
        return !workingAssignments.some((a) => {
          if (a.referee_id !== ref.id) return false;

          const assignedGame = games.find((g) => g.id === a.schedule_id);
          if (!assignedGame) return false;

          return (
            assignedGame.event_date === game.event_date &&
            assignedGame.time === game.time
          );
        });
      });

      if (!availableRef) continue;

      const insertRes = await supabase.from("ref_assignments").insert({
        schedule_id: game.id,
        referee_id: availableRef.id,
        assigned_role: "ref",
        status: "assigned",
      });

      if (!insertRes.error) {
        workingAssignments.push({
          schedule_id: game.id,
          referee_id: availableRef.id,
        });
        assignedCount += 1;
      }
    }

    await loadPageData();
    setMessage(
      assignedCount > 0
        ? `${assignedCount} game(s) auto-assigned.`
        : "No games could be auto-assigned."
    );
    setLoading(false);
  };

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={sectionCard}>
          <h2 style={heading}>Referee Schedule</h2>
          <div style={muted}>Loading games and assignments...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={statsGrid}>
        <FilterTile
          label="All Games"
          value={stats.total}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />

        <FilterTile
          label="Unassigned"
          value={stats.unassigned}
          active={filter === "unassigned"}
          onClick={() => setFilter("unassigned")}
        />

        <FilterTile
          label="Assigned"
          value={stats.assigned}
          active={filter === "assigned"}
          onClick={() => setFilter("assigned")}
        />

        <ActionTile
          label="Auto Assign"
          desc="Assign refs to open games"
          onClick={autoAssignOpenGames}
        />
      </div>

      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Schedule</h2>
            <div style={subheading}>
              Assign referees to games and manage open schedule slots.
            </div>
          </div>
        </div>

        {message ? <div style={messageBox}>{message}</div> : null}

        {filteredGames.length === 0 ? (
          <div style={emptyState}>
            <div style={emptyTitle}>No games found</div>
            <div style={muted}>There are no games in this filter yet.</div>
          </div>
        ) : (
          <div style={listWrap}>
            {filteredGames.map((game) => {
              const assignment = getAssignmentForGame(game.id);
              const availableRefs = getAvailableRefsForGame(game);
              const assignedRef = assignment?.referees || null;

              return (
                <div key={game.id} style={gameCard}>
                  <div style={gameTopRow}>
                    <div>
                      <div style={gameTitle}>{getGameTitle(game)}</div>
                      <div style={metaRow}>
                        <span style={metaPill}>Week {game.week || "-"}</span>
                        <span style={metaPill}>{game.division || "No Division"}</span>
                        <span style={metaPill}>{game.event_date || "No Date"}</span>
                        <span style={metaPill}>{game.time || "No Time"}</span>
                        <span style={metaPill}>{game.field || "No Field"}</span>
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          ...statusBadge,
                          ...(assignment ? assignedBadge : unassignedBadge),
                        }}
                      >
                        {assignment ? "Assigned" : "Open"}
                      </span>
                    </div>
                  </div>

                  <div style={detailsGrid}>
                    <div style={detailTile}>
                      <div style={detailLabel}>Current Referee</div>
                      <div style={assignedName}>
                        {assignedRef ? getRefName(assignedRef) : "No referee assigned"}
                      </div>
                    </div>

                    <div style={detailTile}>
                      <div style={detailLabel}>Assign Referee</div>

                      <select
                        value={selectedRefs[game.id] || ""}
                        onChange={(e) =>
                          setSelectedRefs((prev) => ({
                            ...prev,
                            [game.id]: e.target.value,
                          }))
                        }
                        style={select}
                      >
                        <option value="">Select referee</option>
                        {availableRefs.map((ref) => (
                          <option key={ref.id} value={ref.id}>
                            {getRefName(ref)}
                          </option>
                        ))}
                      </select>

                      <div style={helperText}>
                        Only showing approved referees not already assigned at this time.
                      </div>

                      <button
                        style={assignBtn}
                        onClick={() => assignRefToGame(game)}
                        disabled={!selectedRefs[game.id] || savingId === game.id}
                      >
                        {savingId === game.id ? "Saving..." : assignment ? "Update Assignment" : "Assign Ref"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTile({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...statTile,
        ...(active ? activeStatTile : {}),
      }}
    >
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </button>
  );
}

function ActionTile({ label, desc, onClick }) {
  return (
    <button type="button" onClick={onClick} style={actionTile}>
      <div style={actionTitle}>{label}</div>
      <div style={actionDesc}>{desc}</div>
    </button>
  );
}

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
};

const statTile = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const activeStatTile = {
  outline: "2px solid #16a34a",
  boxShadow: "0 10px 28px rgba(22, 163, 74, 0.16)",
};

const actionTile = {
  background: "#16a34a",
  color: "#ffffff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(22, 163, 74, 0.18)",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const actionTitle = {
  fontSize: "20px",
  fontWeight: 800,
  lineHeight: 1,
};

const actionDesc = {
  marginTop: 8,
  fontSize: "13px",
  opacity: 0.95,
};

const statValue = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1,
};

const statLabel = {
  marginTop: 8,
  fontSize: "13px",
  color: "#64748b",
};

const sectionCard = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 18,
  flexWrap: "wrap",
};

const heading = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#0f172a",
};

const subheading = {
  marginTop: 6,
  color: "#64748b",
  fontSize: "14px",
};

const messageBox = {
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#f0fdf4",
  color: "#166534",
  fontWeight: 600,
};

const emptyState = {
  padding: 24,
  borderRadius: 16,
  background: "#f8fafc",
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 6,
};

const muted = {
  color: "#64748b",
};

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const gameCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#f8fafc",
};

const gameTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const gameTitle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
};

const metaRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
};

const metaPill = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: "12px",
  color: "#475569",
  fontWeight: 600,
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "capitalize",
};

const assignedBadge = {
  background: "#dcfce7",
  color: "#166534",
};

const unassignedBadge = {
  background: "#fef3c7",
  color: "#92400e",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 14,
  marginTop: 16,
};

const detailTile = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
};

const detailLabel = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
  marginBottom: 10,
};

const assignedName = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
};

const select = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: "14px",
};

const helperText = {
  marginTop: 8,
  fontSize: "12px",
  color: "#64748b",
};

const assignBtn = {
  marginTop: 12,
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};
