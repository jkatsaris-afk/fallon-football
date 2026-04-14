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
    const { data } = await supabase.from("teams").select("*");
    setTeams(data || []);
  };

  const loadRefs = async () => {
    setLoadingState(true);
    const { data } = await supabase.from("referees").select("*");
    setRefs(data || []);
    setLoadingState(false);
  };

  const updateCoachInfo = async (ref, updates) => {
    const { error } = await supabase
      .from("referees")
      .update(updates)
      .eq("id", ref.id);

    if (error) {
      console.error(error);
      return;
    }

    setRefs((prev) =>
      prev.map((r) =>
        r.id === ref.id ? { ...r, ...updates } : r
      )
    );
  };

  const divisions = useMemo(() => {
    const values = teams
      .map((t) => t.division || t.division_name || "")
      .filter(Boolean);
    return [...new Set(values)];
  }, [teams]);

  if (loadingState) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={pageWrap}>
      <div style={sectionCard}>
        <h2 style={heading}>Referee Staff</h2>

        <div style={listWrap}>
          {refs.map((ref) => {
            const teamOptions = teams.filter(
              (t) =>
                (t.division || t.division_name) === ref.coach_division
            );

            const selectedTeam = teams.find(
              (t) => t.id === ref.coach_team_id
            );

            return (
              <div key={ref.id} style={refCard}>
                <div style={detailsGrid}>
                  <div style={detailTile}>
                    <div style={detailLabel}>Coach Info</div>

                    {/* Coach toggle */}
                    <select
                      value={ref.is_coach ? "yes" : "no"}
                      onChange={(e) => {
                        const isCoach = e.target.value === "yes";

                        updateCoachInfo(ref, {
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

                    {ref.is_coach && (
                      <>
                        {/* Division */}
                        <select
                          value={ref.coach_division || ""}
                          onChange={(e) => {
                            updateCoachInfo(ref, {
                              coach_division: e.target.value,
                              coach_team_id: null,
                            });
                          }}
                          style={selectSpacing}
                        >
                          <option value="">Select Division</option>
                          {divisions.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>

                        {/* 🔥 TEAM SELECT (UUID STORED, NAME SHOWN) */}
                        <select
                          value={ref.coach_team_id || ""}
                          onChange={(e) => {
                            updateCoachInfo(ref, {
                              coach_team_id: e.target.value || null,
                            });
                          }}
                          style={selectSpacing}
                        >
                          <option value="">Select Team</option>

                          {teamOptions.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.team_name ||
                                team.name ||
                                team.team ||
                                "Unnamed Team"}
                            </option>
                          ))}
                        </select>

                        {/* Optional display */}
                        <div style={helperText}>
                          {selectedTeam
                            ? `Team: ${
                                selectedTeam.team_name ||
                                selectedTeam.name
                              }`
                            : "No team selected"}
                        </div>
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
