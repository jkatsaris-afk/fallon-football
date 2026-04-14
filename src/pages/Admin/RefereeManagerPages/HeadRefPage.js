import React from "react";

export default function HeadRefPage({
  refs,
  loading,
  getName,
  getStatus,
  setHeadRef,
}) {
  const headRef = refs.find((r) => r.is_head_ref);

  if (loading) {
    return (
      <div style={card}>
        <h2 style={heading}>Head Ref</h2>
        <div style={muted}>Loading referees...</div>
      </div>
    );
  }

  return (
    <div style={card}>
      <h2 style={heading}>Head Referee</h2>

      {headRef ? (
        <div style={profileCard}>
          <div style={profileName}>{getName(headRef)}</div>
          <div style={info}>Email: {headRef.email || "-"}</div>
          <div style={info}>Phone: {headRef.phone || "-"}</div>
          <div style={statusStyle(getStatus(headRef))}>{getStatus(headRef)}</div>
        </div>
      ) : (
        <div style={muted}>No Head Ref Assigned</div>
      )}

      <div style={sectionTitle}>Assign Head Ref</div>

      <div style={listWrap}>
        {refs.map((ref) => (
          <div key={ref.id} style={assignRow}>
            <div>
              <div style={assignName}>{getName(ref)}</div>
              <div style={assignSub}>{ref.email || "-"}</div>
            </div>

            <button
              style={headRef?.id === ref.id ? currentBtn : assignBtn}
              onClick={() => setHeadRef(ref.id)}
            >
              {headRef?.id === ref.id ? "Current Head" : "Make Head"}
            </button>
          </div>
        ))}
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

const profileCard = {
  background: "#f8fafc",
  borderRadius: 16,
  padding: 18,
  marginBottom: 24,
};

const profileName = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#0f172a",
};

const info = {
  marginTop: 8,
  color: "#334155",
};

const sectionTitle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 14,
};

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const assignRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  flexWrap: "wrap",
};

const assignName = {
  fontWeight: 700,
  color: "#0f172a",
};

const assignSub = {
  fontSize: 13,
  color: "#64748b",
  marginTop: 4,
};

const assignBtn = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
};

const currentBtn = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  cursor: "pointer",
};

const statusStyle = (s) => ({
  marginTop: 10,
  color:
    s === "approved" ? "#16a34a" : s === "denied" ? "#dc2626" : "#f59e0b",
  fontWeight: 700,
  textTransform: "capitalize",
});
