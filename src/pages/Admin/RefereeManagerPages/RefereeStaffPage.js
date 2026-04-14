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

  /* 🔥 SMOOTH UPDATE (NO RELOAD) */
  const updateCoachInfo = async (refId, updates) => {
    // optimistic update
    setRefs((prev) =>
      prev.map((r) =>
        r.id === refId ? { ...r, ...updates } : r
      )
    );

    const { error } = await supabase
      .from("referees")
      .update(updates)
      .eq("id", refId);

    if (error) {
      console.error("Error updating coach info:", error);
    }
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

  /* 🔥 FIXED DIVISION + TEAM LINK */
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

  const getProfileImage = (ref) => {
    const rawImage =
      ref.profile_image || ref.profile_image_url || ref.photo_url || "";

    if (!rawImage) return DefaultProfile;

    if (rawImage.startsWith("http")) return rawImage;

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(rawImage);

    return data?.publicUrl || DefaultProfile;
  };

  if (loadingState) {
    return <div style={{ padding: 20 }}>Loading referees...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      {filteredRefs.map((ref) => {
        const role = safeGetRole(ref);
        const teamsForDivision = getTeamsForDivision(ref.coach_division);

        return (
          <div key={ref.id} style={{ marginBottom: 20 }}>

            {/* COACH SELECT */}
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
            >
              <option value="no">Not a Coach</option>
              <option value="yes">Is a Coach</option>
            </select>

            {/* 🔥 SMOOTH EXPAND */}
            <div
              style={{
                maxHeight: ref.is_coach ? 200 : 0,
                overflow: "hidden",
                transition: "all 0.25s ease",
              }}
            >

              {/* DIVISION */}
              <select
                value={ref.coach_division || ""}
                onChange={(e) => {
                  e.stopPropagation();

                  updateCoachInfo(ref.id, {
                    coach_division: e.target.value,
                    coach_team_id: null, // reset team when division changes
                  });
                }}
              >
                <option value="">Select Division</option>
                {divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* 🔥 TEAM (NOW WORKS) */}
              <select
                value={ref.coach_team_id || ""}
                onChange={(e) => {
                  e.stopPropagation();

                  updateCoachInfo(ref.id, {
                    coach_team_id: e.target.value,
                  });
                }}
              >
                <option value="">Select Team</option>
                {teamsForDivision.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name || team.team_name}
                  </option>
                ))}
              </select>

            </div>

          </div>
        );
      })}
    </div>
  );
}
