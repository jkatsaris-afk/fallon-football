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

  /* ✅ FIXED: smooth + UUID storage */
  const updateCoachInfo = async (refId, updates) => {
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

  if (loadingState) {
    return <div style={{ padding: 20 }}>Loading referees...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      {refs.map((ref) => {
        const teamsForDivision = getTeamsForDivision(ref.coach_division);

        /* ✅ FIX: find selected team */
        const selectedTeam = teams.find(
          (t) => t.id === ref.coach_team_id
        );

        return (
          <div key={ref.id} style={{ marginBottom: 20 }}>

            {/* COACH TOGGLE */}
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

            {/* SMOOTH EXPAND */}
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
                    coach_team_id: null, // reset team
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

              {/* TEAM SELECT (UUID STORED, NAME SHOWN) */}
              <select
                value={ref.coach_team_id || ""}
                onChange={(e) => {
                  e.stopPropagation();

                  updateCoachInfo(ref.id, {
                    coach_team_id: e.target.value || null,
                  });
                }}
              >
                <option value="">Select Team</option>

                {teamsForDivision.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name || team.team_name || team.team}
                  </option>
                ))}
              </select>

              {/* ✅ DISPLAY SELECTED TEAM NAME */}
              <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>
                {selectedTeam
                  ? `Team: ${selectedTeam.name || selectedTeam.team_name}`
                  : "No team selected"}
              </div>

            </div>

          </div>
        );
      })}
    </div>
  );
}
