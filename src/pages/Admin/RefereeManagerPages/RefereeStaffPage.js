import React from "react";

export default function RefereeStaffPage({
  refs,
  loading,
  getName,
  getStatus,
  getRole,
  displayRole,
  updateStatus,
  updateRole,
}) {
  if (loading) {
    return (
      <div style={card}>
        <h2 style={heading}>Referee Staff</h2>
        <div style={muted}>Loading referees...</div>
      </div>
    );
  }

  return (
    <div style={card}>
      <h2 style={heading}>Referee Staff</h2>

      <div style={tableWrap}>
        <div style={rowHeader}>
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Status</div>
          <div>Role</div>
          <div>Actions</div>
        </div>

        {refs.map((ref) => {
          const role = getRole(ref);

          return (
            <div key={ref.id} style={row}>
              <div>{getName(ref)}</div>
              <div>{ref.email || "-"}</div>
              <div>{ref.phone || "-"}</div>

              <div style={statusStyle(getStatus(ref))}>{getStatus(ref)}</div>

              <div>
                <select
                  value={role}
                  onChange={(e) => updateRole(ref, e.target.value)}
                  style={select}
                >
                  <option value="assistant">Assistant Ref</option>
                  <option value="head">Head Ref</option>
                </select>

                <div style={roleText}>{displayRole(ref)}</div>
              </div>

              <div style={actions}>
                <button
                  style={approveBtn}
                  onClick={() => updateStatus(ref.id, "approved")}
                >
                  Approve
                </button>

                <button
                  style={denyBtn}
                  onClick={() => updateStatus(ref.id, "denied")}
                >
                  Deny
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const card = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const heading = {
  marginTop: 0,
  marginBottom: 18,
  fontSize: "22px",
  color: "#0f172a",
};

const muted = {
  color: "#64748b",
};

const tableWrap = {
  width: "100%",
  overflowX: "auto",
};

const rowHeader = {
  minWidth: 1000,
  display: "grid",
  gridTemplateColumns: "1.2fr 1.2fr 1fr 120px 180px 200px",
  padding: 14,
  fontWeight: 700,
  background: "#f8fafc",
  borderRadius: 12,
  color: "#334155",
};

const row = {
  minWidth: 1000,
  display: "grid",
  gridTemplateColumns: "1.2fr 1.2fr 1fr 120px 180px 200px",
  padding: 14,
  borderBottom: "1px solid #e5e7eb",
  alignItems: "center",
  color: "#0f172a",
};

const select = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
};

const roleText = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 6,
};

const actions = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: 10,
  cursor: "pointer",
};

const denyBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: 10,
  cursor: "pointer",
};

const statusStyle = (s) => ({
  color:
    s === "approved" ? "#16a34a" : s === "denied" ? "#dc2626" : "#f59e0b",
  fontWeight: 700,
  textTransform: "capitalize",
});
