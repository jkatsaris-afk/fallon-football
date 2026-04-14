import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import DefaultProfile from "../../../resources/Default-A.png";

export default function RefereeStaffPage({
  refs,
  loading,
  getName,
  getStatus,
  getRole,
  displayRole,
  updateStatus,
  updateRole,
}) {
  const [teams, setTeams] = useState([]);

  /* 🔥 ONLY LOAD TEAMS */
  useEffect(() => {
    const loadTeams = async () => {
      const { data, error } = await supabase.from("teams").select("*");
      if (error) {
        console.error("Error loading teams:", error);
        setTeams([]);
        return;
      }
      setTeams(data || []);
    };

    loadTeams();
  }, []);

  const divisions = useMemo(() => {
    const values = teams
      .map((t) => t.division || t.division_name || "")
      .filter(Boolean);

    return [...new Set(values)];
  }, [teams]);

  /* 🔥 NO STATE UPDATE HERE */
  const updateCoachInfo = async (ref, updates) => {
    const { error } = await supabase
      .from("referees")
      .update(updates)
      .eq("id", ref.id);

    if (error) {
      console.error("Error updating coach info:", error);
    }
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
      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Staff</h2>
          </div>
        </div>

        <div style={listWrap}>
          {refs.map((ref) => {
            const teamOptions = teams.filter(
              (t) =>
                (t.division || t.division_name) === ref.coach_division
            );

            return (
              <div key={ref.id} style={refCard}>
                <div style={detailsGrid}>
                  
                  {/* 🔥 COACH TILE (CLEAN + STABLE) */}
                  <div style={detailTile}>
                    <div style={detailLabel}>Coach Info</div>

                    <select
                      value={ref.is_coach ? "yes" : "no"}
                      onChange={(e) => {
                        const isCoach = e.target.value === "yes";

                        updateCoachInfo(ref, {
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

                        <select
                          value={ref.coach_team_id || ""}
                          onChange={(e) => {
                            updateCoachInfo(ref, {
                              coach_team_id: e.target.value,
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
