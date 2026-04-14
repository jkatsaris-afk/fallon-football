import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import DefaultProfile from "../../../resources/Default-A.png";

export default function RefereeStaffPage({
  refs = [],
  loading,
  getName,
  getStatus,
  getRole,
  displayRole,
  updateStatus,
  updateRole,
}) {
  const [filter, setFilter] = useState("all");
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadTeams();
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

  const updateCoachInfo = async (refId, updates) => {
    const { error } = await supabase
      .from("referees")
      .update(updates)
      .eq("id", refId);

    if (error) {
      console.error("Error updating coach info:", error);
      return;
    }

    window.location.reload();
  };

  const stats = useMemo(() => {
    const approved = refs.filter((r) => getStatus(r) === "approved").length;
    const pending = refs.filter((r) => getStatus(r) === "pending").length;
    const denied = refs.filter((r) => getStatus(r) === "denied").length;
    const headRefs = refs.filter((r) => getRole(r) === "head").length;

    return {
      total: refs.length,
      approved,
      pending,
      denied,
      headRefs,
    };
  }, [refs, getStatus, getRole]);

  const filteredRefs = useMemo(() => {
    if (filter === "approved") {
      return refs.filter((r) => getStatus(r) === "approved");
    }

    if (filter === "pending") {
      return refs.filter((r) => getStatus(r) === "pending");
    }

    if (filter === "denied") {
      return refs.filter((r) => getStatus(r) === "denied");
    }

    if (filter === "head") {
      return refs.filter((r) => getRole(r) === "head");
    }

    return refs;
  }, [refs, filter, getStatus, getRole]);

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

  if (loading) {
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
        <FilterTile
          label="All Refs"
          value={stats.total}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />

        <FilterTile
          label="Approved"
          value={stats.approved}
          active={filter === "approved"}
          onClick={() => setFilter("approved")}
        />

        <FilterTile
          label="Pending"
          value={stats.pending}
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
        />

        <FilterTile
          label="Denied"
          value={stats.denied}
          active={filter === "denied"}
          onClick={() => setFilter("denied")}
        />

        <FilterTile
          label="Head Ref"
          value={stats.headRefs}
          active={filter === "head"}
          onClick={() => setFilter("head")}
        />
      </div>

      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Staff</h2>
            <div style={subheading}>
              {getFilterLabel()} • Approve referees, update roles, and manage
              staff status.
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
              const status = getStatus(ref);
              const role = getRole(ref);
              const teamOptions = getTeamsForDivision(ref.coach_division || "");

              return (
                <div key={ref.id} style={refCard}>
                  <div style={refTopRow}>
                    <div style={leftSide}>
                      <img
                        src={getProfileImage(ref)}
                        alt={getName(ref) || "Referee"}
                        style={profileImage}
                        onError={(e) => {
                          e.currentTarget.src = DefaultProfile;
                        }}
                      />

                      <div style={nameBlock}>
                        <div style={refName}>
                          {getName(ref) || "Unnamed Referee"}
                        </div>

                        <div style={contactRow}>
                          <span style={contactItem}>
                            {ref.email || "No email"}
                          </span>
                          <span style={dot}>•</span>
                          <span style={contactItem}>
                            {ref.phone || "No phone"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={badgeWrap}>
                      <span
                        style={{
                          ...statusBadge,
                          ...statusBadgeStyles(status),
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  <div style={detailsGrid}>
                    <div style={detailTile}>
                      <div style={detailLabel}>Role</div>

                      <select
                        value={role}
                        onChange={(e) => updateRole(ref, e.target.value)}
                        style={select}
                      >
                        <option value="assistant">Assistant Ref</option>
                        <option value="head">Head Ref</option>
                      </select>

                      <div style={helperText}>{displayRole(ref)}</div>
                    </div>

                    <div style={detailTile}>
                      <div style={detailLabel}>Coach Role</div>

                      <select
                        value={ref.is_coach ? "yes" : "no"}
                        onChange={(e) => {
                          const isCoach = e.target.value === "yes";

                          updateCoachInfo(ref.id, {
                            is_coach: isCoach,
                            coach_division: isCoach
                              ? ref.coach_division || null
                              : null,
                            coach_team_id: isCoach
                              ? ref.coach_team_id || null
                              : null,
                          });
                        }}
                        style={select}
                      >
                        <option value="no">Not a Coach</option>
                        <option value="yes">Is a Coach</option>
                      </select>

                      {ref.is_coach ? (
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
                      ) : null}

                      <div style={helperText}>
                        {ref.is_coach
                          ? `Coaching ${ref.coach_division || "No division selected"}`
                          : "Mark if this referee is also coaching."}
                      </div>
                    </div>

                    <div style={detailTile}>
                      <div style={detailLabel}>Status Actions</div>

                      <div style={buttonRow}>
                        <button
                          style={approveBtn}
                          onClick={() => updateStatus(ref.id, "approved")}
                        >
                          Approve
                        </button>

                        <button
                          style={pendingBtn}
                          onClick={() => updateStatus(ref.id, "pending")}
                        >
                          Pending
                        </button>

                        <button
                          style={denyBtn}
                          onClick={() => updateStatus(ref.id, "denied")}
                        >
                          Deny
                        </button>
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

const statusBadgeStyles = (status) => {
  if (status === "approved") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "denied") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    background: "#fef3c7",
    color: "#92400e",
  };
};

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

const muted = {
  color: "#64748b",
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

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const refCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#f8fafc",
};

const refTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const leftSide = {
  display: "flex",
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap",
};

const profileImage = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid #e2e8f0",
  background: "#ffffff",
};

const nameBlock = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const refName = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
};

const contactRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const contactItem = {
  fontSize: "13px",
  color: "#64748b",
};

const dot = {
  color: "#cbd5e1",
};

const badgeWrap = {
  display: "flex",
  alignItems: "center",
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "capitalize",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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

const select = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: "14px",
};

const selectSpacing = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: "14px",
  marginTop: 10,
};

const helperText = {
  marginTop: 8,
  fontSize: "12px",
  color: "#64748b",
};

const buttonRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const approveBtn = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const pendingBtn = {
  background: "#f59e0b",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const denyBtn = {
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};
