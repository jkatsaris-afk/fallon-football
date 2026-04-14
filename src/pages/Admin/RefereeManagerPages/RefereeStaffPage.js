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

  /* 🔥 FIX PROFILE IMAGES */
  const getProfileImage = (ref) => {
    const raw = ref?.profile_image || "";

    if (!raw) return DefaultProfile;

    if (raw.startsWith("http")) return raw;

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(raw);

    return data?.publicUrl || DefaultProfile;
  };

  const safeStatus = (r) => getStatus ? getStatus(r) : r.status || "pending";
  const safeRole = (r) => getRole ? getRole(r) : r.role || "assistant";

  /* 🔥 FILTER COUNTS */
  const stats = useMemo(() => ({
    total: refs.length,
    approved: refs.filter(r => safeStatus(r) === "approved").length,
    pending: refs.filter(r => safeStatus(r) === "pending").length,
    denied: refs.filter(r => safeStatus(r) === "denied").length,
    head: refs.filter(r => safeRole(r) === "head").length,
  }), [refs]);

  const filteredRefs = useMemo(() => {
    if (filter === "approved") return refs.filter(r => safeStatus(r) === "approved");
    if (filter === "pending") return refs.filter(r => safeStatus(r) === "pending");
    if (filter === "denied") return refs.filter(r => safeStatus(r) === "denied");
    if (filter === "head") return refs.filter(r => safeRole(r) === "head");
    return refs;
  }, [refs, filter]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={pageWrap}>

      {/* 🔥 FILTER TILES BACK */}
      <div style={statsGrid}>
        <FilterTile label="All" value={stats.total} active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterTile label="Approved" value={stats.approved} active={filter==="approved"} onClick={()=>setFilter("approved")} />
        <FilterTile label="Pending" value={stats.pending} active={filter==="pending"} onClick={()=>setFilter("pending")} />
        <FilterTile label="Denied" value={stats.denied} active={filter==="denied"} onClick={()=>setFilter("denied")} />
        <FilterTile label="Head" value={stats.head} active={filter==="head"} onClick={()=>setFilter("head")} />
      </div>

      <div style={sectionCard}>
        <h2 style={heading}>Referee Staff</h2>

        <div style={listWrap}>
          {filteredRefs.map((ref) => {
            const role = safeRole(ref);

            return (
              <div key={ref.id} style={card}>

                {/* 🔥 HEADER */}
                <div style={topRow}>
                  <div style={left}>
                    <img src={getProfileImage(ref)} style={avatar} />

                    <div>
                      <div style={name}>
                        {getName ? getName(ref) : `${ref.first_name} ${ref.last_name}`}
                      </div>
                      <div style={email}>{ref.email}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      ...statusBadge,
                      ...(safeStatus(ref) === "approved"
                        ? approved
                        : safeStatus(ref) === "denied"
                        ? denied
                        : pending),
                    }}
                  >
                    {safeStatus(ref)}
                  </span>
                </div>

                {/* 🔥 DETAILS */}
                <div style={grid}>

                  <div style={tile}>
                    <div style={label}>Role</div>

                    <select
                      value={role}
                      onChange={(e) => updateRole(ref, e.target.value)}
                      style={select}
                    >
                      <option value="assistant">Assistant Ref</option>
                      <option value="head">Head Ref</option>
                    </select>

                    <div style={helper}>
                      {displayRole(ref)}
                    </div>
                  </div>

                  <div style={tile}>
                    <div style={label}>Status</div>

                    <div style={btnRow}>
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
    <button onClick={onClick} style={{
      ...tileBtn,
      ...(active ? activeTileBtn : {})
    }}>
      <div style={tileValue}>{value}</div>
      <div style={tileLabel}>{label}</div>
    </button>
  );
}

/* 🔥 STYLES */

const pageWrap = { display: "flex", flexDirection: "column", gap: 18 };

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
};

const tileBtn = {
  background: "#fff",
  borderRadius: 16,
  padding: 14,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

const activeTileBtn = {
  outline: "2px solid #16a34a",
};

const tileValue = { fontSize: 22, fontWeight: 800 };
const tileLabel = { fontSize: 12, color: "#64748b" };

const sectionCard = {
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
};

const heading = { fontSize: 24, fontWeight: 700 };

const listWrap = { display: "flex", flexDirection: "column", gap: 14 };

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#f8fafc",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 14,
};

const left = { display: "flex", gap: 12, alignItems: "center" };

const avatar = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  objectFit: "cover",
};

const name = { fontWeight: 700 };
const email = { fontSize: 13, color: "#64748b" };

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const tile = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
};

const label = { fontWeight: 700, marginBottom: 8 };

const select = { width: "100%", padding: 10, borderRadius: 12 };

const helper = { fontSize: 12, marginTop: 6 };

const btnRow = { display: "flex", gap: 8 };

const approveBtn = { background: "#16a34a", color: "#fff", border: "none", padding: 10, borderRadius: 12 };
const pendingBtn = { background: "#f59e0b", color: "#fff", border: "none", padding: 10, borderRadius: 12 };
const denyBtn = { background: "#dc2626", color: "#fff", border: "none", padding: 10, borderRadius: 12 };

const statusBadge = { padding: "6px 12px", borderRadius: 999, fontWeight: 700 };
const approved = { background: "#dcfce7", color: "#166534" };
const pending = { background: "#fef3c7", color: "#92400e" };
const denied = { background: "#fee2e2", color: "#991b1b" };
