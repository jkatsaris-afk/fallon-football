import React, { useMemo } from "react";

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
  const stats = useMemo(() => {
    const approved = refs.filter((r) => getStatus(r) === "approved").length;
    const pending = refs.filter((r) => getStatus(r) === "pending").length;
    const denied = refs.filter((r) => getStatus(r) === "denied").length;
    const headRefs = refs.filter((r) => getRole(r) === "head").length;

    return {
      total: refs.length,
      approved,
      pending,
      denied,
      headRefs,
    };
  }, [refs, getStatus, getRole]);

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
      <div style={statsGrid}>
        <StatTile label="Total Refs" value={stats.total} />
        <StatTile label="Approved" value={stats.approved} />
        <StatTile label="Pending" value={stats.pending} />
        <StatTile label="Denied" value={stats.denied} />
        <StatTile label="Head Ref Roles" value={stats.headRefs} />
      </div>

      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Staff</h2>
            <div style={subheading}>
              Approve referees, update roles, and manage staff status.
            </div>
          </div>
        </div>

        {refs.length === 0 ? (
          <div style={emptyState}>
            <div style={emptyTitle}>No referees found</div>
            <div style={muted}>
              Once referee signups come in, they will show here.
            </div>
          </div>
        ) : (
          <div style={listWrap}>
            {refs.map((ref) => {
              const status = getStatus(ref);
              const role = getRole(ref);

              return (
                <div key={ref.id} style={refCard}>
                  <div style={refTopRow}>
                    <div style={nameBlock}>
                      <div style={refName}>{getName(ref) || "Unnamed Referee"}</div>
                      <div style={contactRow}>
                        <span style={contactItem}>{ref.email || "No email"}</span>
                        <span style={dot}>•</span>
                        <span style={contactItem}>{ref.phone || "No phone"}</span>
                      </div>
                    </div>

                    <div style={badgeWrap}>
                      <span
                        style={{
                          ...statusBadge,
                          ...statusBadgeStyles(status),
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

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

                      <div style={helperText}>{displayRole(ref)}</div>
                    </div>

                    <div style={detailTile}>
                      <div style={detailLabel}>Status Actions</div>

                      <div style={buttonRow}>
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
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={statTile}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

const statusBadgeStyles = (status) => {
  if (status === "approved") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (status === "denied") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
    };
  }

  return {
    background: "#fef3c7",
    color: "#92400e",
  };
};

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
};

const statTile = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const statValue = {
  fontSize: "28px",
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1,
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

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 18,
  flexWrap: "wrap",
};

const heading = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 700,
  color: "#0f172a",
};

const subheading = {
  marginTop: 6,
  color: "#64748b",
  fontSize: "14px",
};

const muted = {
  color: "#64748b",
};

const emptyState = {
  padding: 24,
  borderRadius: 16,
  background: "#f8fafc",
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
  marginBottom: 6,
};

const listWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const refCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  background: "#f8fafc",
};

const refTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const nameBlock = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const refName = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
};

const contactRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const contactItem = {
  fontSize: "13px",
  color: "#64748b",
};

const dot = {
  color: "#cbd5e1",
};

const badgeWrap = {
  display: "flex",
  alignItems: "center",
};

const statusBadge = {
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "capitalize",
};

const detailsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
  marginTop: 16,
};

const detailTile = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
};

const detailLabel = {
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
  background: "#ffffff",
  fontSize: "14px",
};

const helperText = {
  marginTop: 8,
  fontSize: "12px",
  color: "#64748b",
};

const buttonRow = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const approveBtn = {
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const pendingBtn = {
  background: "#f59e0b",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};

const denyBtn = {
  background: "#dc2626",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 12,
  cursor: "pointer",
  fontWeight: 600,
};
