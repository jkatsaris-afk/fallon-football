import React, { useMemo, useState } from "react";
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
    const raw = ref?.profile_image || "";
    if (!raw) return DefaultProfile;
    return raw.startsWith("http") ? raw : DefaultProfile;
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading referees...</div>;
  }

  return (
    <div style={pageWrap}>

      {/* FILTER TILES */}
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
                      <div style={contactRow}>{ref.email}</div>
                    </div>
                  </div>
                </div>

                <div style={detailsGrid}>

                  {/* ROLE TILE */}
                  <div style={detailTile}>
                    <div style={detailLabel}>Role</div>

                    <select
                      value={role}
                      onChange={(e) =>
                        updateRole(ref, e.target.value)
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

                  {/* STATUS TILE */}
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

/* FILTER TILE */
function FilterTile({ label, value, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...filterTile,
        ...(active ? activeFilterTile : {}),
      }}
    >
      <div style={filterValue}>{value}</div>
      <div style={filterLabel}>{label}</div>
    </div>
  );
}

/* STYLES */

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

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

const activeFilterTile = {
  outline: "2px solid #16a34a",
};

const filterValue = {
  fontWeight: "bold",
  fontSize: 18,
};

const filterLabel = {
  fontSize: 12,
  color: "#64748b",
};

const sectionCard = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const headerRow = {
  marginBottom: 16,
};

const heading = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 700,
};

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const refCard = {
  background: "#f8fafc",
  borderRadius: 14,
  padding: 14,
};

const refTopRow = {
  marginBottom: 10,
};

const leftSide = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const profileImage = {
  width: 40,
  height: 40,
  borderRadius: "50%",
};

const refName = {
  fontWeight: 700,
};

const contactRow = {
  fontSize: 13,
  color: "#64748b",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const detailTile = {
  background: "#ffffff",
  borderRadius: 12,
  padding: 12,
  border: "1px solid #e5e7eb",
};

const detailLabel = {
  fontSize: 12,
  color: "#64748b",
};

const helperText = {
  fontSize: 12,
  marginTop: 6,
  color: "#64748b",
};

const select = {
  width: "100%",
  marginTop: 6,
};

const buttonRow = {
  display: "flex",
  gap: 6,
  marginTop: 8,
};

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
};

const pendingBtn = {
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
};

const denyBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
};
