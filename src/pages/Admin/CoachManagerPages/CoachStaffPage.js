import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import DefaultProfile from "../../../resources/Default-A.png";

/* 🔥 TEAM LOGOS */
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
import LogoRavens from "../../../resources/Baltimore Ravens.png";

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
  Ravens: LogoRavens,
};

export default function CoachStaffPage() {
  const [coaches, setCoaches] = useState([]);
  const [loadingState, setLoadingState] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    setLoadingState(true);

    const { data, error } = await supabase
      .from("coaches")
      .select(`
        *,
        teams:teams!teams_coach_id_fkey (
          id,
          nfl_team_id,
          division
        ),
        assistant_teams:teams!teams_assistant_coach_id_fkey (
          id,
          nfl_team_id,
          division
        )
      `);

    if (error) {
      console.error(error);
      setCoaches([]);
    } else {
      setCoaches(data || []);
    }

    setLoadingState(false);
  };

  /* ---------------- HELPERS ---------------- */

  const getName = (c) =>
    `${c.first_name || ""} ${c.last_name || ""}`.trim();

  const getStatus = (c) => c.status || "pending";

  const getRole = (c) => {
    if (!c.role) return "assistant";
    return c.role.toLowerCase().includes("head") ? "head" : "assistant";
  };

  const displayRole = (c) => {
    if (!c.role) return "Assistant Coach";
    return c.role.toLowerCase().includes("head")
      ? "Head Coach"
      : "Assistant Coach";
  };

  /* 🔥 GET TEAM (HEAD OR ASSISTANT) */
  const getCoachTeam = (coach) => {
    if (coach.teams && coach.teams.length > 0) return coach.teams[0];
    if (coach.assistant_teams && coach.assistant_teams.length > 0) return coach.assistant_teams[0];
    return null;
  };

  /* ---------------- UPDATE ---------------- */

  const handleStatusUpdate = async (id, status) => {
    await supabase.from("coaches").update({ status }).eq("id", id);
    loadCoaches();
  };

  const handleRoleUpdate = async (coach, newRole) => {
    await supabase
      .from("coaches")
      .update({
        role: newRole === "head" ? "Head Coach" : "Assistant Coach",
      })
      .eq("id", coach.id);

    loadCoaches();
  };

  /* ---------------- STATS ---------------- */

  const stats = useMemo(() => ({
    total: coaches.length,
    pending: coaches.filter(c => getStatus(c) === "pending").length,
    denied: coaches.filter(c => getStatus(c) === "denied").length,
    head: coaches.filter(c => getRole(c) === "head").length,
    assistant: coaches.filter(c => getRole(c) === "assistant").length,
  }), [coaches]);

  /* ---------------- FILTER ---------------- */

  const filteredCoaches = useMemo(() => {
    if (filter === "pending") return coaches.filter(c => getStatus(c) === "pending");
    if (filter === "denied") return coaches.filter(c => getStatus(c) === "denied");
    if (filter === "head") return coaches.filter(c => getRole(c) === "head");
    if (filter === "assistant") return coaches.filter(c => getRole(c) === "assistant");
    return coaches;
  }, [coaches, filter]);

  /* ---------------- IMAGE ---------------- */

  const getProfileImage = (c) => {
    const raw =
      c?.profile_image ||
      c?.profile_image_url ||
      c?.photo_url ||
      "";

    if (!raw) return DefaultProfile;
    if (raw.startsWith("http")) return raw;

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(raw);

    return data?.publicUrl || DefaultProfile;
  };

  if (loadingState) {
    return <div style={{ padding: 20 }}>Loading coaches...</div>;
  }

  return (
    <div style={wrap}>

      <div style={statsGrid}>
        <StatTile label="All" value={stats.total} active={filter==="all"} onClick={()=>setFilter("all")} />
        <StatTile label="Pending" value={stats.pending} active={filter==="pending"} onClick={()=>setFilter("pending")} />
        <StatTile label="Denied" value={stats.denied} active={filter==="denied"} onClick={()=>setFilter("denied")} />
        <StatTile label="Head Coaches" value={stats.head} active={filter==="head"} onClick={()=>setFilter("head")} />
        <StatTile label="Assistant Coaches" value={stats.assistant} active={filter==="assistant"} onClick={()=>setFilter("assistant")} />
      </div>

      <div style={section}>
        <h2 style={title}>Coach Staff</h2>

        <div style={list}>
          {filteredCoaches.map((coach) => {
            const role = getRole(coach);
            const team = getCoachTeam(coach);

            return (
              <div key={coach.id} style={card}>

                <div style={row}>
                  <div style={left}>
                    <img src={getProfileImage(coach)} style={avatar} />

                    <div>
                      <div style={name}>{getName(coach)}</div>

                      <div style={sub}>
                        {(coach.email || "") + (coach.phone ? " • " + coach.phone : "")}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    ...badge,
                    ...(getStatus(coach)==="approved" ? green :
                        getStatus(coach)==="denied" ? red : yellow)
                  }}>
                    {getStatus(coach)}
                  </span>
                </div>

                <div style={grid}>

                  <div style={tile}>
                    <div style={label}>Role</div>
                    <select
                      value={role}
                      onChange={(e) => handleRoleUpdate(coach, e.target.value)}
                      style={input}
                    >
                      <option value="assistant">Assistant Coach</option>
                      <option value="head">Head Coach</option>
                    </select>
                  </div>

                  <div style={tile}>
                    <div style={label}>Status</div>

                    <div style={btnRow}>
                      <button style={btnGreen} onClick={() => handleStatusUpdate(coach.id, "approved")}>Approve</button>
                      <button style={btnYellow} onClick={() => handleStatusUpdate(coach.id, "pending")}>Pending</button>
                      <button style={btnRed} onClick={() => handleStatusUpdate(coach.id, "denied")}>Deny</button>
                    </div>

                    {/* 🔥 ASSIGNED TEAM DISPLAY */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Assigned Team
                      </div>

                      {!team && (
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          🚫 Not Assigned
                        </div>
                      )}

                      {team && (
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                          {TEAM_LOGOS[team.nfl_team_id] && (
                            <img
                              src={TEAM_LOGOS[team.nfl_team_id]}
                              style={{ width: 28, height: 28 }}
                            />
                          )}
                          <div style={{ fontSize: 13 }}>
                            {team.nfl_team_id}
                          </div>
                        </div>
                      )}
                    </div>

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

/* ---------------- STAT TILE ---------------- */

function StatTile({ label, value, active, onClick }) {
  return (
    <div onClick={onClick} style={{ ...stat, ...(active ? statActive : {}) }}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

/* STYLES unchanged below */
