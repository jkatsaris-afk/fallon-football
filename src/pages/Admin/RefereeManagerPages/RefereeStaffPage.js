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
      
      {/* 🔥 FILTER TILES (YOUR UI) */}
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
                      <div>{ref.email}</div>
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
