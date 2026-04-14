import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import DefaultProfile from "../../../resources/Default-A.png";

export default function RefereeStaffPage({
  getName,
  getStatus,
  getRole,
  displayRole,
  updateStatus,
  updateRole,
}) {
  const [refs, setRefs] = useState([]);
  const [loadingState, setLoadingState] = useState(true);

  const [filter, setFilter] = useState("all");
  const [teams, setTeams] = useState([]);

  /* SAFE FALLBACKS */
  const safeGetStatus = (r) =>
    getStatus ? getStatus(r) : r.status || "pending";

  const safeGetRole = (r) =>
    getRole ? getRole(r) : r.role || "assistant";

  const safeGetName = (r) =>
    getName
      ? getName(r)
      : `${r.first_name || ""} ${r.last_name || ""}`.trim() ||
        "Unnamed Referee";

  useEffect(() => {
    loadTeams();
    loadRefs();
  }, []);

  const loadTeams = async () => {
    const { data, error } = await supabase.from("teams").select("*");

    if (error) {
      console.error("Error loading teams:", error);
      setTeams([]);
      return;
    }

    setTeams(data || []);
  };

  const loadRefs = async () => {
    setLoadingState(true);

    const { data, error } = await supabase
      .from("referees")
      .select("*");

    if (error) {
      console.error("Error loading referees:", error);
      setRefs([]);
    } else {
      setRefs(data || []);
    }

    setLoadingState(false);
  };

  /* 🔥 FIXED COACH UPDATE (NO RELOAD) */
  const updateCoachInfo = async (refId, updates) => {
    const { error } = await supabase
      .from("referees")
      .update(updates)
      .eq("id", refId);

    if (error) {
      console.error("Error updating coach info:", error);
      return;
    }

    // ✅ update UI instantly
    setRefs((prev) =>
      prev.map((r) =>
        r.id === refId ? { ...r, ...updates } : r
      )
    );
  };

  const stats = useMemo(() => {
    const approved = refs.filter((r) => safeGetStatus(r) === "approved").length;
    const pending = refs.filter((r) => safeGetStatus(r) === "pending").length;
    const denied = refs.filter((r) => safeGetStatus(r) === "denied").length;
    const headRefs = refs.filter((r) => safeGetRole(r) === "head").length;

    return {
      total: refs.length,
      approved,
      pending,
      denied,
      headRefs,
    };
  }, [refs]);

  const filteredRefs = useMemo(() => {
    if (filter === "approved") {
      return refs.filter((r) => safeGetStatus(r) === "approved");
    }

    if (filter === "pending") {
      return refs.filter((r) => safeGetStatus(r) === "pending");
    }

    if (filter === "denied") {
      return refs.filter((r) => safeGetStatus(r) === "denied");
    }

    if (filter === "head") {
      return refs.filter((r) => safeGetRole(r) === "head");
    }

    return refs;
  }, [refs, filter]);

  const divisions = useMemo(() => {
    const values = teams
      .map((t) => t.division || t.division_name || "")
      .filter(Boolean);

    return [...new Set(values)].sort();
  }, [teams]);

  const getTeamsForDivision = (division) => {
    return teams.filter(
      (t) => (t.division || t.division_name || "") === division
    );
  };

  const getTeamName = (team) => {
    return team?.name || team?.team_name || team?.team || "Unnamed Team";
  };

  const getProfileImage = (ref) => {
    const rawImage =
      ref.profile_image || ref.profile_image_url || ref.photo_url || "";

    if (!rawImage) return DefaultProfile;

    if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) {
      return rawImage;
    }

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(rawImage);

    return data?.publicUrl || DefaultProfile;
  };

  const getFilterLabel = () => {
    if (filter === "approved") return "Approved Referees";
    if (filter === "pending") return "Pending Referees";
    if (filter === "denied") return "Denied Referees";
    if (filter === "head") return "Head Ref Roles";
    return "All Referees";
  };

  if (loadingState) {
    return (
      <div style={pageWrap}>
        <div style={sectionCard}>
          <h2 style={heading}>Referee Staff</h2>
          <div style={muted}>Loading referees...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={statsGrid}>
        <FilterTile label="All Refs" value={stats.total} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterTile label="Approved" value={stats.approved} active={filter === "approved"} onClick={() => setFilter("approved")} />
        <FilterTile label="Pending" value={stats.pending} active={filter === "pending"} onClick={() => setFilter("pending")} />
        <FilterTile label="Denied" value={stats.denied} active={filter === "denied"} onClick={() => setFilter("denied")} />
        <FilterTile label="Head Ref" value={stats.headRefs} active={filter === "head"} onClick={() => setFilter("head")} />
      </div>

      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Staff</h2>
            <div style={subheading}>
              {getFilterLabel()} • Approve referees, update roles, and manage staff status.
            </div>
          </div>
        </div>

        {filteredRefs.length === 0 ? (
          <div style={emptyState}>
            <div style={emptyTitle}>No referees found</div>
            <div style={muted}>
              There are no referees in this filter yet.
            </div>
          </div>
        ) : (
          <div style={listWrap}>
            {filteredRefs.map((ref) => {
              const status = safeGetStatus(ref);
              const role = safeGetRole(ref);
              const teamOptions = getTeamsForDivision(ref.coach_division);

              return (
                <div key={ref.id} style={refCard}>
                  <div style={refTopRow}>
                    <div style={leftSide}>
                      <img
                        src={getProfileImage(ref)}
                        alt={safeGetName(ref)}
                        style={profileImage}
                        onError={(e) => {
                          e.currentTarget.src = DefaultProfile;
                        }}
                      />

                      <div style={nameBlock}>
                        <div style={refName}>{safeGetName(ref)}</div>
                        <div style={contactRow}>
                          <span style={contactItem}>{ref.email || "No email"}</span>
                          <span style={dot}>•</span>
                          <span style={contactItem}>{ref.phone || "No phone"}</span>
                        </div>
                      </div>
                    </div>

                    <div style={badgeWrap}>
                      <span style={{ ...statusBadge, ...statusBadgeStyles(status) }}>
                        {status}
                      </span>
                    </div>
                  </div>

                  <div style={detailsGrid}>
                    {/* ROLE */}
                    <div style={detailTile}>
                      <div style={detailLabel}>Role</div>
                      <select value={role} onChange={(e) => updateRole(ref, e.target.value)} style={select}>
                        <option value="assistant">Assistant Ref</option>
                        <option value="head">Head Ref</option>
                      </select>
                      <div style={helperText}>{displayRole(ref)}</div>
                    </div>

                    {/* COACH */}
                    <div style={detailTile}>
                      <div style={detailLabel}>Coach Info</div>

                      <select
                        value={ref.is_coach ? "yes" : "no"}
                        onChange={(e) => {
                          const isCoach = e.target.value === "yes";

                          updateCoachInfo(ref.id, {
                            is_coach: isCoach,
                            coach_division: isCoach ? ref.coach_division || null : null,
                            coach_team_id: isCoach ? ref.coach_team_id || null : null,
                          });
                        }}
                        style={select}
                      >
                        <option value="no">Not a Coach</option>
                        <option value="yes">Is a Coach</option>
                      </select>

                      {ref.is_coach && (
                        <>
                          <select
                            value={ref.coach_division || ""}
                            onChange={(e) =>
                              updateCoachInfo(ref.id, {
                                coach_division: e.target.value || null,
                                coach_team_id: null,
                              })
                            }
                            style={selectSpacing}
                          >
                            <option value="">Select Division</option>
                            {divisions.map((division) => (
                              <option key={division} value={division}>
                                {division}
                              </option>
                            ))}
                          </select>

                          <select
                            value={ref.coach_team_id || ""}
                            onChange={(e) =>
                              updateCoachInfo(ref.id, {
                                coach_team_id: e.target.value || null,
                              })
                            }
                            style={selectSpacing}
                          >
                            <option value="">Select Team</option>
                            {teamOptions.map((team) => (
                              <option key={team.id} value={team.id}>
                                {getTeamName(team)}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>

                    {/* STATUS */}
                    <div style={detailTile}>
                      <div style={detailLabel}>Status Actions</div>
                      <div style={buttonRow}>
                        <button style={approveBtn} onClick={() => updateStatus(ref.id, "approved")}>Approve</button>
                        <button style={pendingBtn} onClick={() => updateStatus(ref.id, "pending")}>Pending</button>
                        <button style={denyBtn} onClick={() => updateStatus(ref.id, "denied")}>Deny</button>
                      </div>
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
