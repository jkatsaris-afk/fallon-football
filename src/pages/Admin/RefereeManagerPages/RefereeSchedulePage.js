import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

import Logo49ers from "../../../resources/San Francisco 49ers.png";
import LogoBengals from "../../../resources/Cincinnati Bengals.png";
import LogoBills from "../../../resources/Buffalo Bills.png";
import LogoBroncos from "../../../resources/Denver Broncos.png";
import LogoChiefs from "../../../resources/Kansas City Chiefs.png";
import LogoColts from "../../../resources/Indianapolis Colts.png";
import LogoEagles from "../../../resources/Philadelphia Eagles.png";
import LogoJets from "../../../resources/New York Jets.png";
import LogoLions from "../../../resources/Detroit Lions.png";
import LogoRaiders from "../../../resources/Las Vegas Raiders.png";
import LogoRams from "../../../resources/Los Angeles Rams.png";
import LogoSteelers from "../../../resources/Pittsburgh Steelers.png";

const TEAM_LOGOS = {
  "49ers": Logo49ers,
  Bengals: LogoBengals,
  Bills: LogoBills,
  Broncos: LogoBroncos,
  Chiefs: LogoChiefs,
  Colts: LogoColts,
  Eagles: LogoEagles,
  Jets: LogoJets,
  Lions: LogoLions,
  Raiders: LogoRaiders,
  Rams: LogoRams,
  Steelers: LogoSteelers,
};

export default function RefereeSchedulePage() {
  const [games, setGames] = useState([]);
  const [refs, setRefs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedRefs, setSelectedRefs] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
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

    if (gamesRes.error) console.error("Error loading games:", gamesRes.error);
    if (refsRes.error) console.error("Error loading referees:", refsRes.error);
    if (assignmentsRes.error) {
      console.error("Error loading assignments:", assignmentsRes.error);
    }

    setGames(gamesRes.data || []);
    setRefs(refsRes.data || []);
    setAssignments(assignmentsRes.data || []);
    setLoading(false);
  };

  const assignmentsByGame = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (!a.schedule_id) return;
      if (!map[a.schedule_id]) map[a.schedule_id] = [];
      map[a.schedule_id].push(a);
    });

    Object.keys(map).forEach((gameId) => {
      map[gameId] = map[gameId].slice().sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return aTime - bTime;
      });
    });

    return map;
  }, [assignments]);

  const stats = useMemo(() => {
    const fullyAssigned = games.filter(
      (g) => (assignmentsByGame[g.id] || []).length >= 2
    ).length;

    const partiallyAssigned = games.filter((g) => {
      const count = (assignmentsByGame[g.id] || []).length;
      return count === 1;
    }).length;

    const openGames = games.filter(
      (g) => (assignmentsByGame[g.id] || []).length === 0
    ).length;

    return {
      total: games.length,
      openGames,
      partiallyAssigned,
      fullyAssigned,
    };
  }, [games, assignmentsByGame]);

  const filteredGames = useMemo(() => {
    if (filter === "open") {
      return games.filter((g) => (assignmentsByGame[g.id] || []).length === 0);
    }

    if (filter === "partial") {
      return games.filter((g) => (assignmentsByGame[g.id] || []).length === 1);
    }

    if (filter === "full") {
      return games.filter((g) => (assignmentsByGame[g.id] || []).length >= 2);
    }

    return games;
  }, [games, filter, assignmentsByGame]);

  const getRefName = (ref) =>
    `${ref?.first_name || ""} ${ref?.last_name || ""}`.trim() || "Unnamed Ref";

  const getAssignmentsForGame = (gameId) => assignmentsByGame[gameId] || [];

  const getTeamLogo = (teamName) => TEAM_LOGOS[teamName] || null;

  const getGameStatus = (game) => {
    const count = getAssignmentsForGame(game.id).length;
    if (count >= 2) return "full";
    if (count === 1) return "partial";
    return "open";
  };

  const isRefBusyAtGameTime = (refId, game, excludeAssignmentId = null) => {
    return assignments.some((a) => {
      if (a.referee_id !== refId) return false;
      if (excludeAssignmentId && a.id === excludeAssignmentId) return false;

      const assignedGame = games.find((g) => g.id === a.schedule_id);
      if (!assignedGame) return false;

      return (
        assignedGame.event_date === game.event_date &&
        assignedGame.time === game.time
      );
    });
  };

  const getAvailableRefsForGame = (game, slotIndex) => {
    const currentAssignments = getAssignmentsForGame(game.id);
    const currentSlotAssignment = currentAssignments[slotIndex] || null;
    const assignedRefIds = currentAssignments
      .filter((a, index) => index !== slotIndex)
      .map((a) => a.referee_id);

    return refs.filter((ref) => {
      if (assignedRefIds.includes(ref.id)) return false;

      return !isRefBusyAtGameTime(
        ref.id,
        game,
        currentSlotAssignment ? currentSlotAssignment.id : null
      );
    });
  };

  const assignRefToSlot = async (game, slotIndex) => {
    const selectedKey = `${game.id}-${slotIndex}`;
    const refereeId = selectedRefs[selectedKey];
    if (!refereeId) return;

    const currentAssignments = getAssignmentsForGame(game.id);
    const currentAssignment = currentAssignments[slotIndex] || null;

    setSavingKey(selectedKey);
    setMessage("");

    const busy = isRefBusyAtGameTime(
      refereeId,
      game,
      currentAssignment ? currentAssignment.id : null
    );

    if (busy) {
      setMessage("That referee is already assigned to another game at that time.");
      setSavingKey(null);
      return;
    }

    const duplicateOnSameGame = currentAssignments.some(
      (a, index) => index !== slotIndex && a.referee_id === refereeId
    );

    if (duplicateOnSameGame) {
      setMessage("That referee is already assigned to this game.");
      setSavingKey(null);
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
        assigned_role: slotIndex === 0 ? "Ref 1" : "Ref 2",
        status: "assigned",
      });

      error = insertRes.error;
    }

    if (error) {
      console.error("Error assigning referee:", error);
      setMessage("Could not assign referee.");
      setSavingKey(null);
      return;
    }

    setMessage("Referee assignment updated.");
    await loadPageData();
    setSavingKey(null);
  };

  const autoAssignOpenGames = async () => {
    setLoading(true);
    setMessage("");

    const workingAssignments = [...assignments];
    let assignedCount = 0;

    for (const game of games) {
      const currentAssignments = workingAssignments.filter(
        (a) => a.schedule_id === game.id
      );

      while (currentAssignments.length < 2) {
        const alreadyAssignedIds = currentAssignments.map((a) => a.referee_id);

        const availableRef = refs.find((ref) => {
          if (alreadyAssignedIds.includes(ref.id)) return false;

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

        if (!availableRef) break;

        const slotNumber = currentAssignments.length + 1;

        const insertRes = await supabase.from("ref_assignments").insert({
          schedule_id: game.id,
          referee_id: availableRef.id,
          assigned_role: slotNumber === 1 ? "Ref 1" : "Ref 2",
          status: "assigned",
        });

        if (insertRes.error) {
          console.error("Auto assign error:", insertRes.error);
          break;
        }

        const newAssignment = {
          schedule_id: game.id,
          referee_id: availableRef.id,
          assigned_role: slotNumber === 1 ? "Ref 1" : "Ref 2",
        };

        workingAssignments.push(newAssignment);
        currentAssignments.push(newAssignment);
        assignedCount += 1;
      }
    }

    await loadPageData();
    setMessage(
      assignedCount > 0
        ? `${assignedCount} referee slot(s) auto-assigned.`
        : "No referee slots could be auto-assigned."
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
          label="Open Games"
          value={stats.openGames}
          active={filter === "open"}
          onClick={() => setFilter("open")}
        />

        <FilterTile
          label="1 Ref Assigned"
          value={stats.partiallyAssigned}
          active={filter === "partial"}
          onClick={() => setFilter("partial")}
        />

        <FilterTile
          label="2 Refs Assigned"
          value={stats.fullyAssigned}
          active={filter === "full"}
          onClick={() => setFilter("full")}
        />

        <ActionTile
          label="Auto Assign Refs"
          desc="Fill both ref slots for games"
          onClick={autoAssignOpenGames}
        />
      </div>

      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Schedule</h2>
            <div style={subheading}>
              Assign 2 referees per game and manage open referee slots.
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
              const gameAssignments = getAssignmentsForGame(game.id);
              const status = getGameStatus(game);
              const teamLogo = getTeamLogo(game.team);
              const opponentLogo = getTeamLogo(game.opponent);

              return (
                <div key={game.id} style={gameCard}>
                  <div style={gameTopRow}>
                    <div style={matchupWrap}>
                      <div style={teamBlock}>
                        {teamLogo ? (
                          <img
                            src={teamLogo}
                            alt={game.team || "Team"}
                            style={teamLogoStyle}
                          />
                        ) : (
                          <div style={logoFallback}>{(game.team || "?").slice(0, 1)}</div>
                        )}
                        <div style={teamName}>{game.team || "TBD"}</div>
                      </div>

                      <div style={vsWrap}>vs</div>

                      <div style={teamBlock}>
                        {opponentLogo ? (
                          <img
                            src={opponentLogo}
                            alt={game.opponent || "Opponent"}
                            style={teamLogoStyle}
                          />
                        ) : (
                          <div style={logoFallback}>
                            {(game.opponent || "?").slice(0, 1)}
                          </div>
                        )}
                        <div style={teamName}>{game.opponent || "TBD"}</div>
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          ...statusBadge,
                          ...(status === "full"
                            ? fullBadge
                            : status === "partial"
                            ? partialBadge
                            : openBadge),
                        }}
                      >
                        {status === "full"
                          ? "2 Refs Assigned"
                          : status === "partial"
                          ? "1 Ref Assigned"
                          : "Open"}
                      </span>
                    </div>
                  </div>

                  <div style={metaRow}>
                    <span style={metaPill}>Week {game.week || "-"}</span>
                    <span style={metaPill}>{game.division || "No Division"}</span>
                    <span style={metaPill}>{game.event_date || "No Date"}</span>
                    <span style={metaPill}>{game.time || "No Time"}</span>
                    <span style={metaPill}>{game.field || "No Field"}</span>
                  </div>

                  <div style={detailsGrid}>
                    {[0, 1].map((slotIndex) => {
                      const slotAssignment = gameAssignments[slotIndex] || null;
                      const assignedRef = slotAssignment?.referees || null;
                      const availableRefs = getAvailableRefsForGame(game, slotIndex);
                      const selectedKey = `${game.id}-${slotIndex}`;

                      return (
                        <div key={slotIndex} style={detailTile}>
                          <div style={detailLabel}>
                            {slotIndex === 0 ? "Referee 1" : "Referee 2"}
                          </div>

                          <div style={assignedName}>
                            {assignedRef
                              ? getRefName(assignedRef)
                              : "No referee assigned"}
                          </div>

                          <select
                            value={selectedRefs[selectedKey] || ""}
                            onChange={(e) =>
                              setSelectedRefs((prev) => ({
                                ...prev,
                                [selectedKey]: e.target.value,
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
                            Approved referees only. Same-time conflicts are blocked.
                          </div>

                          <button
                            style={assignBtn}
                            onClick={() => assignRefToSlot(game, slotIndex)}
                            disabled={
                              !selectedRefs[selectedKey] || savingKey === selectedKey
                            }
                          >
                            {savingKey === selectedKey
                              ? "Saving..."
                              : slotAssignment
                              ? "Update Ref"
                              : "Assign Ref"}
                          </button>
                        </div>
                      );
                    })}
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

const matchupWrap = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const teamBlock = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const teamLogoStyle = {
  width: 46,
  height: 46,
  objectFit: "contain",
};

const logoFallback = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  background: "#e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  color: "#334155",
};

const teamName = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
};

const vsWrap = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#64748b",
};

const metaRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 14,
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
};

const fullBadge = {
  background: "#dcfce7",
  color: "#166534",
};

const partialBadge = {
  background: "#dbeafe",
  color: "#1d4ed8",
};

const openBadge = {
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
  marginBottom: 10,
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
