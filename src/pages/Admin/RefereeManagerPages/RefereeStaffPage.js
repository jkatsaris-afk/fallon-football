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

  const updateCoachInfo = async (refId, updates) => {
    setRefs((prev) =>
      prev.map((r) =>
        r.id === refId ? { ...r, ...updates } : r
      )
    );

    await supabase
      .from("referees")
      .update(updates)
      .eq("id", refId);
  };

  const stats = useMemo(() => ({
    total: refs.length,
    approved: refs.filter(r => safeGetStatus(r) === "approved").length,
    pending: refs.filter(r => safeGetStatus(r) === "pending").length,
    denied: refs.filter(r => safeGetStatus(r) === "denied").length,
    headRefs: refs.filter(r => safeGetRole(r) === "head").length,
  }), [refs]);

  const filteredRefs = useMemo(() => {
    if (filter === "approved") return refs.filter(r => safeGetStatus(r) === "approved");
    if (filter === "pending") return refs.filter(r => safeGetStatus(r) === "pending");
    if (filter === "denied") return refs.filter(r => safeGetStatus(r) === "denied");
    if (filter === "head") return refs.filter(r => safeGetRole(r) === "head");
    return refs;
  }, [refs, filter]);

  const divisions = useMemo(() => {
    const values = teams.map(t => t.division || t.division_name || "").filter(Boolean);
    return [...new Set(values)];
  }, [teams]);

  if (loadingState) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={pageWrap}>
      <div style={statsGrid}>
        <FilterTile label="All Refs" value={stats.total} active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterTile label="Approved" value={stats.approved} active={filter==="approved"} onClick={()=>setFilter("approved")} />
        <FilterTile label="Pending" value={stats.pending} active={filter==="pending"} onClick={()=>setFilter("pending")} />
        <FilterTile label="Denied" value={stats.denied} active={filter==="denied"} onClick={()=>setFilter("denied")} />
        <FilterTile label="Head Ref" value={stats.headRefs} active={filter==="head"} onClick={()=>setFilter("head")} />
      </div>

      <div style={sectionCard}>
        <div style={headerRow}>
          <h2 style={heading}>Referee Staff</h2>
        </div>

        <div style={listWrap}>
          {filteredRefs.map((ref) => {
            const teamsForDivision = teams.filter(
              (t) => (t.division || t.division_name) === ref.coach_division
            );

            return (
              <div key={ref.id} style={refCard}>
                <div style={detailsGrid}>

                  {/* 🔥 HARD EVENT BLOCK (MAIN FIX) */}
                  <div
                    style={detailTile}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >

                    <div style={detailLabel}>Coach Info</div>

                    {/* COACH */}
                    <div onClick={(e) => e.stopPropagation()}>
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
                    </div>

                    {ref.is_coach && (
                      <>
                        {/* DIVISION */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={ref.coach_division || ""}
                            onChange={(e) => {
                              e.stopPropagation();

                              updateCoachInfo(ref.id, {
                                coach_division: e.target.value,
                                coach_team_id: null,
                              });
                            }}
                            style={selectSpacing}
                          >
                            <option value="">Select Division</option>
                            {divisions.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>

                        {/* TEAM */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={ref.coach_team_id || ""}
                            onChange={(e) => {
                              e.stopPropagation();

                              updateCoachInfo(ref.id, {
                                coach_team_id: e.target.value,
                              });
                            }}
                            style={selectSpacing}
                          >
                            <option value="">Select Team</option>

                            {teamsForDivision.map((team) => (
                              <option key={team.id} value={team.id}>
                                {team.team_name || team.name || team.team || team.nfl_team || "Unnamed Team"}
                              </option>
                            ))}
                          </select>
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
