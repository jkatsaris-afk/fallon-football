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
  /* ✅ FIX: local refs state instead of props */
  const [refs, setRefs] = useState([]);
  const [loadingState, setLoadingState] = useState(true);

  const [filter, setFilter] = useState("all");
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadTeams();
    loadRefs(); // ✅ FIX: load refs
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

  /* ✅ FIX: fetch referees directly */
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

  /* ✅ FIX: use loadingState instead */
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
              const status = getStatus(ref);
              const role = getRole(ref);
              const teamOptions = getTeamsForDivision(ref.coach_division);

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
                        <div style={refName}>{getName(ref) || "Unnamed Referee"}</div>
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
                    <div style={detailTile}>
                      <div style={detailLabel}>Role</div>
                      <select value={role} onChange={(e) => updateRole(ref, e.target.value)} style={select}>
                        <option value="assistant">Assistant Ref</option>
                        <option value="head">Head Ref</option>
                      </select>
                      <div style={helperText}>{displayRole(ref)}</div>
                    </div>

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
