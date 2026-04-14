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

  const updateCoachInfo = async (refId, updates) => {
    const { error } = await supabase
      .from("referees")
      .update(updates)
      .eq("id", refId);

    if (error) {
      console.error("Error updating coach info:", error);
      return;
    }

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

        <div style={listWrap}>
          {filteredRefs.map((ref) => {
            return (
              <div key={ref.id} style={refCard}>
                <div style={detailsGrid}>

                  {/* 🔥 FIX: stop navigation bubbling */}
                  <div style={detailTile} onClick={(e) => e.stopPropagation()}>
                    <div style={detailLabel}>Coach Info</div>

                    <select
                      value={ref.is_coach ? "yes" : "no"}
                      onChange={(e) => {
                        e.stopPropagation();

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
                          onChange={(e) => {
                            e.stopPropagation();

                            updateCoachInfo(ref.id, {
                              coach_division: e.target.value || null,
                              coach_team_id: null,
                            });
                          }}
                          style={selectSpacing}
                        >
                          <option value="">Select Division</option>
                          {divisions.map((division) => (
                            <option key={division} value={division}>
                              {division}
                            </option>
                          ))}
                        </select>

                        {/* 🔥 FIX: correct team display + UUID */}
                        <select
                          value={ref.coach_team_id || ""}
                          onChange={(e) => {
                            e.stopPropagation();

                            updateCoachInfo(ref.id, {
                              coach_team_id: e.target.value || null,
                            });
                          }}
                          style={selectSpacing}
                        >
                          <option value="">Select Team</option>

                          {teams
                            .filter(
                              (t) =>
                                (t.division || t.division_name) === ref.coach_division
                            )
                            .map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.team_name || team.name || team.team || team.nfl_team || "Unnamed Team"}
                              </option>
                            ))}
                        </select>
                      </>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
