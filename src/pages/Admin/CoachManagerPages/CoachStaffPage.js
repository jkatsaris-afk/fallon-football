import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import { applyPersonSeasonFilter, getActiveSeason } from "../../../utils/season";
import DefaultProfile from "../../../resources/Default-A.png";

/* TEAM LOGOS */
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

/* FINAL LOGO MAP */
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

/* 🔥 HANDLE ABBREVIATIONS */
const TEAM_ABBR_MAP = {
  sf: "49ers",
  cin: "Bengals",
  buf: "Bills",
  den: "Broncos",
  kc: "Chiefs",
  ind: "Colts",
  phi: "Eagles",
  nyj: "Jets",
  det: "Lions",
  lv: "Raiders",
  lar: "Rams",
  pit: "Steelers",
  bal: "Ravens",
};

/* 🔥 FINAL NORMALIZER */
const normalizeTeam = (raw) => {
  if (!raw) return "";

  const lower = raw.toLowerCase();

  // abbreviation case
  if (TEAM_ABBR_MAP[lower]) return TEAM_ABBR_MAP[lower];

  // full lowercase → Proper Case
  if (lower === "49ers") return "49ers";

  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export default function CoachStaffPage() {
  const [coaches, setCoaches] = useState([]);
  const [complaintCounts, setComplaintCounts] = useState({});
  const [loadingState, setLoadingState] = useState(true);
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    setLoadingState(true);
    const active = await getActiveSeason();

    const coachQuery = supabase
      .from("coaches")
      .select(`
        *,
        teams:teams!teams_coach_id_fkey (
          id,
          division,
          nfl_team:nfl_teams (
            short_name
          )
        ),
        assistant_teams:teams!teams_assistant_coach_id_fkey (
          id,
          division,
          nfl_team:nfl_teams (
            short_name
          )
        )
      `);
    const { data, error } = await applyPersonSeasonFilter(coachQuery, active);

    if (error) {
      console.error(error);
      setCoaches([]);
    } else {
      setCoaches(data || []);
    }

    const { data: complaintData, error: complaintError } = await supabase
      .from("complaints")
      .select("coach_id,status");

    if (!complaintError) {
      const counts = {};
      (complaintData || []).forEach((complaint) => {
        if (!complaint.coach_id) return;
        counts[complaint.coach_id] = counts[complaint.coach_id] || { total: 0, open: 0 };
        counts[complaint.coach_id].total += 1;
        if ((complaint.status || "open") !== "closed") counts[complaint.coach_id].open += 1;
      });
      setComplaintCounts(counts);
    }

    setLoadingState(false);
  };

  const updateCoachNotes = async (coachId, notes) => {
    setCoaches((current) => current.map((coach) => (
      coach.id === coachId ? { ...coach, notes } : coach
    )));
  };

  const saveCoachNotes = async (coach) => {
    setStatus("");
    const { error } = await supabase
      .from("coaches")
      .update({ notes: coach.notes || "" })
      .eq("id", coach.id);

    if (error) {
      console.error(error);
      setStatus("Coach notes could not be saved.");
      return;
    }

    setStatus("Coach notes saved.");
  };

  const getName = (c) =>
    `${c.first_name || ""} ${c.last_name || ""}`.trim();

  const getStatus = (c) => c.status || "pending";

  const getRole = (c) => {
    if (!c.role) return "assistant";
    return c.role.toLowerCase().includes("head") ? "head" : "assistant";
  };

  const getCoachTeam = (coach) => {
    if (coach.teams?.length) return coach.teams[0];
    if (coach.assistant_teams?.length) return coach.assistant_teams[0];
    return null;
  };

  const stats = useMemo(() => ({
    total: coaches.length,
    pending: coaches.filter(c => getStatus(c) === "pending").length,
    denied: coaches.filter(c => getStatus(c) === "denied").length,
    head: coaches.filter(c => getRole(c) === "head").length,
    assistant: coaches.filter(c => getRole(c) === "assistant").length,
  }), [coaches]);

  const filteredCoaches = useMemo(() => {
    if (filter === "pending") return coaches.filter(c => getStatus(c) === "pending");
    if (filter === "denied") return coaches.filter(c => getStatus(c) === "denied");
    if (filter === "head") return coaches.filter(c => getRole(c) === "head");
    if (filter === "assistant") return coaches.filter(c => getRole(c) === "assistant");
    return coaches;
  }, [coaches, filter]);

  if (loadingState) return <div style={{ padding: 20 }}>Loading coaches...</div>;

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
        {status && <div style={statusBox}>{status}</div>}

        <div style={list}>
          {filteredCoaches.map((coach) => {
            const team = getCoachTeam(coach);

            const raw = team?.nfl_team?.short_name;
            const teamName = normalizeTeam(raw);
            const logo = TEAM_LOGOS[teamName];
            const coachComplaints = complaintCounts[coach.id] || { total: 0, open: 0 };

            return (
              <div key={coach.id} style={card}>
                <div style={row}>
                  <div style={left}>
                    <img src={DefaultProfile} style={avatar} />
                    <div>
                      <div style={name}>{getName(coach)}</div>
                      <div style={sub}>{coach.email}</div>
                      <div style={sub}>{formatPhone(coach.phone)}</div>
                    </div>
                  </div>
                  {coachComplaints.total > 0 && (
                    <div style={complaintBadge}>
                      {coachComplaints.open} open / {coachComplaints.total} total complaints
                    </div>
                  )}
                </div>

                <div style={tile}>
                  <div style={label}>Assigned Team</div>

                  {!team && <div style={{ color:"#9ca3af" }}>🚫 Not Assigned</div>}

                  {team && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        {logo && <img src={logo} style={{ width:28 }} />}
                        <div>{teamName}</div>
                      </div>

                      <div style={divisionBadge}>
                        {team.division}
                      </div>
                    </div>
                  )}
                </div>

                <div style={notesBox}>
                  <div style={label}>Coach Notes</div>
                  <textarea
                    value={coach.notes || ""}
                    onChange={(e) => updateCoachNotes(coach.id, e.target.value)}
                    placeholder="Internal notes for reports and coach packets"
                    style={notesInput}
                  />
                  <button style={saveBtn} onClick={() => saveCoachNotes(coach)}>
                    Save Notes
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* COMPONENT */
function StatTile({ label, value, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:"#fff",
      borderRadius:18,
      padding:18,
      outline: active ? "2px solid #16a34a" : "none"
    }}>
      <div style={{ fontSize:26, fontWeight:800 }}>{value}</div>
      <div style={{ fontSize:12 }}>{label}</div>
    </div>
  );
}

/* STYLES */
const wrap = { display:"flex", flexDirection:"column", gap:20 };
const statsGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))", gap:14 };
const section = { background:"#fff", borderRadius:18, padding:20 };
const title = { fontSize:24, fontWeight:700 };
const list = { display:"flex", flexDirection:"column", gap:16 };
const card = { border:"1px solid #e5e7eb", borderRadius:18, padding:18 };
const row = { display:"flex", justifyContent:"space-between" };
const left = { display:"flex", gap:12 };
const avatar = { width:56, borderRadius:"50%" };
const name = { fontWeight:700 };
const sub = { fontSize:13, color:"#64748b" };
const tile = { marginTop:10 };
const label = { fontWeight:700 };
const divisionBadge = { background:"#f1f5f9", padding:"4px 8px", borderRadius:8 };
const statusBox = { background:"#ecfdf5", border:"1px solid #bbf7d0", borderRadius:12, color:"#166534", fontWeight:800, padding:"10px 12px", margin:"10px 0" };
const complaintBadge = { background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:999, color:"#9a3412", fontSize:12, fontWeight:800, padding:"8px 10px" };
const notesBox = { marginTop:14, display:"flex", flexDirection:"column", gap:8 };
const notesInput = { border:"1px solid #dbe4ee", borderRadius:12, minHeight:72, padding:10, resize:"vertical", width:"100%", boxSizing:"border-box" };
const saveBtn = { alignSelf:"flex-start", background:"#166534", border:"none", borderRadius:10, color:"#fff", cursor:"pointer", fontWeight:800, padding:"9px 12px" };

function formatPhone(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return String(value);
}
