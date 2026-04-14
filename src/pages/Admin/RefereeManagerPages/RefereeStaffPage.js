import React from "react";
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
  const getProfileImage = (ref) => {
    const raw = ref?.profile_image || "";
    if (!raw) return DefaultProfile;
    return raw.startsWith("http") ? raw : DefaultProfile;
  };

  const getNameSafe = (r) =>
    `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Unnamed Ref";

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={sectionCard}>
          <h2 style={heading}>Referee Staff</h2>
          <div style={muted}>Loading referees...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Staff</h2>
            <div style={subheading}>
              Manage referee roles and approvals
            </div>
          </div>
        </div>

        <div style={listWrap}>
          {refs.map((ref) => {
            const role = getRole(ref);

            return (
              <div key={ref.id} style={card}>

                {/* 🔥 TOP ROW */}
                <div style={topRow}>
                  <div style={left}>
                    <img src={getProfileImage(ref)} style={avatar} />

                    <div>
                      <div style={name}>
                        {getName ? getName(ref) : getNameSafe(ref)}
                      </div>

                      <div style={email}>{ref.email}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      ...statusBadge,
                      ...(getStatus(ref) === "approved"
                        ? approved
                        : getStatus(ref) === "denied"
                        ? denied
                        : pending),
                    }}
                  >
                    {getStatus(ref)}
                  </span>
                </div>

                {/* 🔥 DETAILS */}
                <div style={grid}>

                  {/* ROLE */}
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

                    <div style={helper}>
                      {displayRole(ref)}
                    </div>
                  </div>

                  {/* STATUS */}
                  <div style={tile}>
                    <div style={label}>Status</div>

                    <div style={btnRow}>
                      <button
                        style={approveBtn}
                        onClick={() => updateStatus(ref.id, "approved")}
                      >
                        Approve
                      </button>

                      <button
                        style={pendingBtn}
                        onClick={() => updateStatus(ref.id, "pending")}
                      >
                        Pending
                      </button>

                      <button
                        style={denyBtn}
                        onClick={() => updateStatus(ref.id, "denied")}
                      >
                        Deny
                      </button>
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

/* 🔥 STYLE MATCHES SCHEDULE */

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const sectionCard = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const headerRow = {
  marginBottom: 18,
};

const heading = {
  fontSize: "24px",
  fontWeight: 700,
  margin: 0,
};

const subheading = {
  marginTop: 6,
  fontSize: "14px",
  color: "#64748b",
};

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

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

const left = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const avatar = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  objectFit: "cover",
};

const name = {
  fontSize: "16px",
  fontWeight: 700,
};

const email = {
  fontSize: "13px",
  color: "#64748b",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
};

const tile = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
};

const label = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#475569",
  marginBottom: 10,
};

const select = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
};

const helper = {
  marginTop: 8,
  fontSize: "12px",
  color: "#64748b",
};

const btnRow = {
  display: "flex",
  gap: 8,
};

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 600,
};

const pendingBtn = {
  background: "#f59e0b",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 600,
};

const denyBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "10px 12px",
  borderRadius: 12,
  fontWeight: 600,
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: "12px",
  fontWeight: 700,
};

const approved = {
  background: "#dcfce7",
  color: "#166534",
};

const pending = {
  background: "#fef3c7",
  color: "#92400e",
};

const denied = {
  background: "#fee2e2",
  color: "#991b1b",
};

const muted = {
  color: "#64748b",
};
