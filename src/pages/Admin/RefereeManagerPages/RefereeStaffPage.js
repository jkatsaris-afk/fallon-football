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

  /* 🔥 FIXED STATUS UPDATE */
  const handleStatusUpdate = async (id, status) => {
    await supabase
      .from("referees")
      .update({ status })
      .eq("id", id);

    loadRefs();
  };

  /* 🔥 FIXED ROLE UPDATE */
  const handleRoleUpdate = async (ref, newRole) => {
    const roleValue =
      newRole === "head" ? "Head Ref" : "Assistant Ref";

    await supabase
      .from("referees")
      .update({ role: roleValue })
      .eq("id", ref.id);

    loadRefs();
  };

  const safeGetStatus = (r) => {
    try { return getStatus ? getStatus(r) : r.status || "pending"; }
    catch { return r.status || "pending"; }
  };

  const safeGetRole = (r) => {
    try { return getRole ? getRole(r) : r.role || "assistant"; }
    catch { return r.role || "assistant"; }
  };

  const safeGetName = (r) => {
    try {
      return getName
        ? getName(r)
        : `${r.first_name || ""} ${r.last_name || ""}`.trim();
    } catch {
      return "Unnamed Referee";
    }
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
            const role = safeGetRole(ref);

            return (
              <div key={ref.id} style={refCard}>

                <div style={refTopRow}>
                  <div style={leftSide}>
                    <img src={getProfileImage(ref)} style={profileImage} />

                    <div>
                      <div style={refName}>{safeGetName(ref)}</div>
                      <div style={email}>{ref.email}</div>
                      <div style={phone}>{ref.phone || "No phone"}</div>
                    </div>
                  </div>
                </div>

                <div style={detailsGrid}>

                  {/* ROLE */}
                  <div style={detailTile}>
                    <div style={detailLabel}>Role</div>

                    <select
                      value={role}
                      onChange={(e) =>
                        handleRoleUpdate(ref, e.target.value)
                      }
                      style={select}
                    >
                      <option value="assistant">Assistant Ref</option>
                      <option value="head">Head Ref</option>
                    </select>

                    <div style={helperText}>
                      {displayRole(ref)}
                    </div>
                  </div>

                  {/* STATUS */}
                  <div style={detailTile}>
                    <div style={detailLabel}>Status</div>

                    <div style={buttonRow}>
                      <button style={approveBtn} onClick={() => handleStatusUpdate(ref.id, "approved")}>Approve</button>
                      <button style={pendingBtn} onClick={() => handleStatusUpdate(ref.id, "pending")}>Pending</button>
                      <button style={denyBtn} onClick={() => handleStatusUpdate(ref.id, "denied")}>Deny</button>
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

/* FILTER TILE */
function FilterTile({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 12,
        border: active ? "2px solid #16a34a" : "1px solid #e5e7eb",
        cursor: "pointer",
      }}
    >
      <div style={{ fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12 }}>{label}</div>
    </button>
  );
}

/* ORIGINAL STYLES (UNCHANGED) */

const pageWrap = { display: "flex", flexDirection: "column", gap: 20 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 };
const sectionCard = { background: "#fff", borderRadius: 18, padding: 20 };
const headerRow = { marginBottom: 16 };
const heading = { fontSize: 22, fontWeight: 700 };
const listWrap = { display: "flex", flexDirection: "column", gap: 12 };
const refCard = { background: "#f8fafc", borderRadius: 14, padding: 14 };
const refTopRow = { marginBottom: 10 };
const leftSide = { display: "flex", alignItems: "center", gap: 12 };
const profileImage = { width: 40, height: 40, borderRadius: "50%" };
const refName = { fontWeight: 700 };
const email = { fontSize: 13, color: "#64748b" };
const phone = { fontSize: 13, color: "#475569" };
const detailsGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const detailTile = { background: "#fff", borderRadius: 12, padding: 12 };
const detailLabel = { fontSize: 12, color: "#64748b" };
const helperText = { fontSize: 12 };
const select = { width: "100%" };
const buttonRow = { display: "flex", gap: 8 };
const approveBtn = { background: "#16a34a", color: "#fff", padding: 6, borderRadius: 6 };
const pendingBtn = { background: "#f59e0b", color: "#fff", padding: 6, borderRadius: 6 };
const denyBtn = { background: "#dc2626", color: "#fff", padding: 6, borderRadius: 6 };
