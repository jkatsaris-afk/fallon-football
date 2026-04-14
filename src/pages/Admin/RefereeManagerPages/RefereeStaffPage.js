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

  const safeGetStatus = (r) => getStatus ? getStatus(r) : r.status || "pending";
  const safeGetRole = (r) => getRole ? getRole(r) : r.role || "assistant";
  const safeGetName = (r) =>
    getName ? getName(r) : `${r.first_name || ""} ${r.last_name || ""}`.trim();

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
    const raw = ref.profile_image || "";
    if (!raw) return DefaultProfile;

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

      {/* 🔥 FILTER TILES (MATCH SCHEDULE) */}
      <div style={statsGrid}>
        <FilterTile label="All Refs" value={stats.total} active={filter==="all"} onClick={()=>setFilter("all")} />
        <FilterTile label="Approved" value={stats.approved} active={filter==="approved"} onClick={()=>setFilter("approved")} />
        <FilterTile label="Pending" value={stats.pending} active={filter==="pending"} onClick={()=>setFilter("pending")} />
        <FilterTile label="Denied" value={stats.denied} active={filter==="denied"} onClick={()=>setFilter("denied")} />
        <FilterTile label="Head Ref" value={stats.headRefs} active={filter==="head"} onClick={()=>setFilter("head")} />
      </div>

      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Staff</h2>
            <div style={subheading}>Manage referee roles and approvals</div>
          </div>
        </div>

        <div style={listWrap}>
          {filteredRefs.map((ref) => {
            const role = safeGetRole(ref);

            return (
              <div key={ref.id} style={card}>

                {/* HEADER */}
                <div style={topRow}>
                  <div style={left}>
                    <img src={getProfileImage(ref)} style={avatar} />
                    <div>
                      <div style={name}>{safeGetName(ref)}</div>
                      <div style={email}>{ref.email}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      ...statusBadge,
                      ...(safeGetStatus(ref) === "approved"
                        ? approved
                        : safeGetStatus(ref) === "denied"
                        ? denied
                        : pending),
                    }}
                  >
                    {safeGetStatus(ref)}
                  </span>
                </div>

                {/* DETAIL GRID */}
                <div style={detailsGrid}>

                  <div style={tile}>
                    <div style={label}>Role</div>

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

                    <div style={helper}>{displayRole(ref)}</div>
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
    <button
      onClick={onClick}
      style={{
        ...statTile,
        ...(active ? activeStatTile : {}),
      }}
    >
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </button>
  );
}

/* 🔥 STYLES (MATCH SCHEDULE EXACTLY) */

const pageWrap = { display: "flex", flexDirection: "column", gap: 20 };

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 16,
};

const statTile = {
  textAlign: "left",
  border: "none",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const activeStatTile = {
  outline: "2px solid #16a34a",
  boxShadow: "0 10px 28px rgba(22, 163, 74, 0.16)",
};

const statValue = {
  fontSize: "26px",
  fontWeight: 800,
};

const statLabel = {
  marginTop: 8,
  fontSize: "13px",
  color: "#64748b",
};

const sectionCard = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const headerRow = { marginBottom: 18 };

const heading = { fontSize: "24px", fontWeight: 700 };
const subheading = { fontSize: "14px", color: "#64748b" };

const listWrap = { display: "flex", flexDirection: "column", gap: 16 };

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#f8fafc",
};

const topRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const left = { display: "flex", alignItems: "center", gap: 12 };

const avatar = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  objectFit: "cover",
};

const name = { fontSize: "16px", fontWeight: 700 };
const email = { fontSize: "13px", color: "#64748b" };

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 16,
};

const tile = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
};

const label = { fontWeight: 700, marginBottom: 8 };

const select = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
};

const helper = { fontSize: 12, marginTop: 6 };

const btnRow = { display: "flex", gap: 8 };

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 12,
};

const pendingBtn = {
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 12,
};

const denyBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 12,
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontWeight: 700,
};

const approved = { background: "#dcfce7", color: "#166534" };
const pending = { background: "#fef3c7", color: "#92400e" };
const denied = { background: "#fee2e2", color: "#991b1b" };
