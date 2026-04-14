import React, { useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import DefaultProfile from "../../../resources/Default-A.png";

export default function RefereeStaffPage({
  refs = [],
  loading,
  getName,
  getStatus,
  getRole,
  displayRole,
  updateStatus,
  updateRole,
}) {
  const [filter, setFilter] = useState("all");

  const safeGetStatus = (r) => getStatus ? getStatus(r) : r.status || "pending";
  const safeGetRole = (r) => getRole ? getRole(r) : r.role || "assistant";

  const safeGetName = (r) =>
    getName
      ? getName(r)
      : `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Unnamed Referee";

  /* 🔥 FIXED IMAGE HANDLING (FROM YOUR OLD VERSION) */
  const getProfileImage = (ref) => {
    const raw = ref?.profile_image || "";

    if (!raw) return DefaultProfile;

    if (raw.startsWith("http")) return raw;

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(raw);

    return data?.publicUrl || DefaultProfile;
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

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={pageWrap}>

      {/* 🔥 STATS TILES */}
      <div style={statsGrid}>
        <FilterTile label="All" value={stats.total} active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterTile label="Approved" value={stats.approved} active={filter==="approved"} onClick={()=>setFilter("approved")} />
        <FilterTile label="Pending" value={stats.pending} active={filter==="pending"} onClick={()=>setFilter("pending")} />
        <FilterTile label="Denied" value={stats.denied} active={filter==="denied"} onClick={()=>setFilter("denied")} />
        <FilterTile label="Head" value={stats.headRefs} active={filter==="head"} onClick={()=>setFilter("head")} />
      </div>

      <div style={sectionCard}>
        <h2 style={heading}>Referee Staff</h2>

        <div style={listWrap}>
          {filteredRefs.map((ref) => {
            const role = safeGetRole(ref);

            return (
              <div key={ref.id} style={refCard}>

                {/* 🔥 HEADER ROW (THIS WAS MISSING BEFORE) */}
                <div style={refTopRow}>
                  <div style={leftSide}>
                    <img src={getProfileImage(ref)} style={profileImage} />
                    <div>
                      <div style={refName}>{safeGetName(ref)}</div>
                      <div style={contactRow}>{ref.email}</div>
                    </div>
                  </div>
                </div>

                {/* 🔥 DETAIL GRID */}
                <div style={detailsGrid}>

                  <div style={detailTile}>
                    <div style={detailLabel}>Role</div>

                    <select
                      value={role}
                      onChange={(e) => updateRole(ref, e.target.value)}
                      style={select}
                    >
                      <option value="assistant">Assistant Ref</option>
                      <option value="head">Head Ref</option>
                    </select>

                    <div style={helperText}>
                      {displayRole(ref)}
                    </div>
                  </div>

                  <div style={detailTile}>
                    <div style={detailLabel}>Status</div>

                    <div style={buttonRow}>
                      <button style={approveBtn} onClick={() => updateStatus(ref.id, "approved")}>Approve</button>
                      <button style={pendingBtn} onClick={() => updateStatus(ref.id, "pending")}>Pending</button>
                      <button style={denyBtn} onClick={() => updateStatus(ref.id, "denied")}>Deny</button>
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

/* 🔥 FILTER TILE */
function FilterTile({ label, value, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      ...filterTile,
      ...(active ? activeFilterTile : {})
    }}>
      <div style={filterValue}>{value}</div>
      <div style={filterLabel}>{label}</div>
    </div>
  );
}

/* 🔥 STYLES (MATCH YOUR ORIGINAL LOOK) */

const pageWrap = { display: "flex", flexDirection: "column", gap: 20 };

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 12,
};

const filterTile = {
  background: "#fff",
  padding: 12,
  borderRadius: 12,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
};

const activeFilterTile = { outline: "2px solid #16a34a" };

const filterValue = { fontWeight: "bold", fontSize: 18 };
const filterLabel = { fontSize: 12, color: "#64748b" };

const sectionCard = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const heading = { fontSize: "22px", fontWeight: 700 };

const listWrap = { display: "flex", flexDirection: "column", gap: 12 };

const refCard = {
  background: "#f8fafc",
  borderRadius: 14,
  padding: 14,
};

const refTopRow = { marginBottom: 10 };

const leftSide = { display: "flex", alignItems: "center", gap: 12 };

const profileImage = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  objectFit: "cover",
};

const refName = { fontWeight: 700, fontSize: 15 };
const contactRow = { fontSize: 13, color: "#64748b" };

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const detailTile = {
  background: "#fff",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
};

const detailLabel = { fontSize: 12, color: "#64748b" };
const helperText = { fontSize: 12, marginTop: 6 };

const select = { width: "100%", marginTop: 6 };

const buttonRow = { display: "flex", gap: 6, marginTop: 8 };

const approveBtn = { background: "#16a34a", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6 };
const pendingBtn = { background: "#f59e0b", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6 };
const denyBtn = { background: "#dc2626", color: "#fff", border: "none", padding: "6px 10px", borderRadius: 6 };
