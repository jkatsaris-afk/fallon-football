import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import DefaultProfile from "../../../resources/Default-A.png";

export default function RefereeStaffPage({
  getName,
  getStatus,
  getRole,
  displayRole,
}) {
  const [refs, setRefs] = useState([]);
  const [loadingState, setLoadingState] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadRefs();
  }, []);

  const loadRefs = async () => {
    setLoadingState(true);
    const { data, error } = await supabase.from("referees").select("*");

    if (error) {
      console.error(error);
      setRefs([]);
    } else {
      setRefs(data || []);
    }

    setLoadingState(false);
  };

  /* 🔥 FIXED UPDATES */
  const handleStatusUpdate = async (id, status) => {
    await supabase.from("referees").update({ status }).eq("id", id);
    loadRefs();
  };

  const handleRoleUpdate = async (ref, newRole) => {
    const roleValue =
      newRole === "head" ? "Head Ref" : "Assistant Ref";

    await supabase
      .from("referees")
      .update({ role: roleValue })
      .eq("id", ref.id);

    loadRefs();
  };

  const safeGetStatus = (r) => getStatus ? getStatus(r) : r.status || "pending";
  const safeGetRole = (r) => getRole ? getRole(r) : r.role || "assistant";
  const safeGetName = (r) =>
    getName ? getName(r) : `${r.first_name || ""} ${r.last_name || ""}`.trim();

  const stats = useMemo(() => ({
    total: refs.length,
    approved: refs.filter(r => safeGetStatus(r) === "approved").length,
    pending: refs.filter(r => safeGetStatus(r) === "pending").length,
    denied: refs.filter(r => safeGetStatus(r) === "denied").length,
    head: refs.filter(r => safeGetRole(r) === "head").length,
  }), [refs]);

  const filteredRefs = useMemo(() => {
    if (filter === "approved") return refs.filter(r => safeGetStatus(r) === "approved");
    if (filter === "pending") return refs.filter(r => safeGetStatus(r) === "pending");
    if (filter === "denied") return refs.filter(r => safeGetStatus(r) === "denied");
    if (filter === "head") return refs.filter(r => safeGetRole(r) === "head");
    return refs;
  }, [refs, filter]);

  const getProfileImage = (ref) => {
    const raw =
      ref?.profile_image ||
      ref?.profile_image_url ||
      ref?.photo_url ||
      "";

    if (!raw) return DefaultProfile;
    if (raw.startsWith("http")) return raw;

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(raw);

    return data?.publicUrl || DefaultProfile;
  };

  if (loadingState) {
    return <div style={{ padding: 20 }}>Loading referees...</div>;
  }

  return (
    <div style={wrap}>

      {/* 🔥 CLEAN STATS (SCHEDULE STYLE) */}
      <div style={statsGrid}>
        <StatTile label="All" value={stats.total} active={filter==="all"} onClick={()=>setFilter("all")} />
        <StatTile label="Approved" value={stats.approved} active={filter==="approved"} onClick={()=>setFilter("approved")} />
        <StatTile label="Pending" value={stats.pending} active={filter==="pending"} onClick={()=>setFilter("pending")} />
        <StatTile label="Denied" value={stats.denied} active={filter==="denied"} onClick={()=>setFilter("denied")} />
        <StatTile label="Head" value={stats.head} active={filter==="head"} onClick={()=>setFilter("head")} />
      </div>

      <div style={section}>
        <h2 style={title}>Referee Staff</h2>

        <div style={list}>
          {filteredRefs.map((ref) => {
            const role = safeGetRole(ref);

            return (
              <div key={ref.id} style={card}>

                {/* HEADER */}
                <div style={row}>
                  <div style={left}>
                    <img src={getProfileImage(ref)} style={avatar} />
                    <div>
                      <div style={name}>{safeGetName(ref)}</div>
                      <div style={sub}>{ref.email}</div>
                      <div style={sub}>{ref.phone || "No phone"}</div>
                    </div>
                  </div>

                  <span style={{
                    ...badge,
                    ...(safeGetStatus(ref)==="approved" ? green :
                        safeGetStatus(ref)==="denied" ? red : yellow)
                  }}>
                    {safeGetStatus(ref)}
                  </span>
                </div>

                {/* TILES */}
                <div style={grid}>

                  <div style={tile}>
                    <div style={label}>Role</div>
                    <select
                      value={role}
                      onChange={(e) => handleRoleUpdate(ref, e.target.value)}
                      style={input}
                    >
                      <option value="assistant">Assistant Ref</option>
                      <option value="head">Head Ref</option>
                    </select>
                  </div>

                  <div style={tile}>
                    <div style={label}>Status</div>

                    <div style={btnRow}>
                      <button style={btnGreen} onClick={() => handleStatusUpdate(ref.id, "approved")}>Approve</button>
                      <button style={btnYellow} onClick={() => handleStatusUpdate(ref.id, "pending")}>Pending</button>
                      <button style={btnRed} onClick={() => handleStatusUpdate(ref.id, "denied")}>Deny</button>
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

/* 🔥 CLEAN STATS TILE */
function StatTile({ label, value, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      ...stat,
      ...(active ? statActive : {})
    }}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

/* STYLES (MATCH SCHEDULE) */

const wrap = { display:"flex", flexDirection:"column", gap:20 };

const statsGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))",
  gap:14
};

const stat = {
  background:"#fff",
  borderRadius:18,
  padding:18,
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)",
  cursor:"pointer"
};

const statActive = {
  outline:"2px solid #16a34a"
};

const statValue = { fontSize:26, fontWeight:800 };
const statLabel = { fontSize:12, color:"#64748b" };

const section = {
  background:"#fff",
  borderRadius:18,
  padding:20,
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)"
};

const title = { fontSize:24, fontWeight:700 };

const list = { display:"flex", flexDirection:"column", gap:16 };

const card = {
  border:"1px solid #e5e7eb",
  borderRadius:18,
  padding:18,
  background:"#f8fafc"
};

const row = { display:"flex", justifyContent:"space-between", marginBottom:14 };
const left = { display:"flex", gap:12, alignItems:"center" };

const avatar = { width:48, height:48, borderRadius:"50%" };

const name = { fontWeight:700 };
const sub = { fontSize:13, color:"#64748b" };

const grid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(260px,1fr))",
  gap:14
};

const tile = {
  background:"#fff",
  borderRadius:16,
  padding:16
};

const label = { fontWeight:700, marginBottom:8 };

const input = { width:"100%", padding:10, borderRadius:10 };

const btnRow = { display:"flex", gap:8 };

const btnGreen = { background:"#16a34a", color:"#fff", padding:10, borderRadius:10 };
const btnYellow = { background:"#f59e0b", color:"#fff", padding:10, borderRadius:10 };
const btnRed = { background:"#dc2626", color:"#fff", padding:10, borderRadius:10 };

const badge = { padding:"6px 12px", borderRadius:999, fontWeight:700 };
const green = { background:"#dcfce7", color:"#166534" };
const yellow = { background:"#fef3c7", color:"#92400e" };
const red = { background:"#fee2e2", color:"#991b1b" };
