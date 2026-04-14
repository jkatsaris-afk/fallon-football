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
    return <div style={{ padding: 20 }}>Loading referees...</div>;
  }

  return (
    <div style={wrap}>

      {/* 🔥 HEAD REF PROFILE */}
      <div style={section}>
        <h2 style={title}>Head Referee</h2>

        {headRef ? (
          <div style={profileCard}>

            <div style={profileTop}>
              <div style={avatarLarge} />
              <div>
                <div style={name}>{getName(headRef)}</div>
                <div style={sub}>
                  {(headRef.email || "") +
                    (headRef.phone ? " • " + headRef.phone : "")}
                </div>

                <span style={{
                  ...badge,
                  ...(getStatus(headRef)==="approved"
                    ? green
                    : getStatus(headRef)==="denied"
                    ? red
                    : yellow)
                }}>
                  {getStatus(headRef)}
                </span>
              </div>
            </div>

            {/* 🔥 INFO GRID */}
            <div style={grid}>
              <InfoTile label="Email" value={headRef.email || "-"} />
              <InfoTile label="Phone" value={headRef.phone || "-"} />
              <InfoTile label="Experience" value={headRef.experience || "-"} />
              <InfoTile label="Notes" value={headRef.notes || "-"} />
            </div>

          </div>
        ) : (
          <div style={empty}>No Head Ref Assigned</div>
        )}
      </div>

      {/* 🔥 ASSIGN SECTION */}
      <div style={section}>
        <h3 style={subTitle}>Assign Head Ref</h3>

        <div style={list}>
          {refs.map((ref) => (
            <div key={ref.id} style={assignCard}>
              <div>
                <div style={name}>{getName(ref)}</div>
                <div style={sub}>
                  {(ref.email || "") +
                    (ref.phone ? " • " + ref.phone : "")}
                </div>
              </div>

              <button
                style={
                  headRef?.id === ref.id ? currentBtn : assignBtn
                }
                onClick={() => setHeadRef(ref.id)}
              >
                {headRef?.id === ref.id ? "Current" : "Make Head"}
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* 🔥 SMALL TILE */
function InfoTile({ label, value }) {
  return (
    <div style={tile}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

/* STYLES */

const wrap = { display: "flex", flexDirection: "column", gap: 20 };

const section = {
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

const title = { fontSize: 24, fontWeight: 700 };
const subTitle = { fontSize: 18, fontWeight: 700 };

const profileCard = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const profileTop = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
};

const avatarLarge = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "#e5e7eb",
};

const name = { fontSize: 18, fontWeight: 700 };
const sub = { fontSize: 13, color: "#64748b" };

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))",
  gap: 14,
};

const tile = {
  background: "#f8fafc",
  borderRadius: 14,
  padding: 14,
  border: "1px solid #e5e7eb",
};

const labelStyle = {
  fontSize: 12,
  color: "#64748b",
  marginBottom: 6,
};

const valueStyle = {
  fontWeight: 600,
};

const list = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const assignCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  flexWrap: "wrap",
};

const assignBtn = {
  background: "rgba(37,99,235,0.12)",
  color: "#1d4ed8",
  border: "1px solid rgba(37,99,235,0.25)",
  padding: "8px 12px",
  borderRadius: 10,
};

const currentBtn = {
  background: "rgba(34,197,94,0.12)",
  color: "#166534",
  border: "1px solid rgba(34,197,94,0.25)",
  padding: "8px 12px",
  borderRadius: 10,
};

const badge = {
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
  marginTop: 6,
};

const green = { background: "rgba(34,197,94,0.12)", color: "#166534" };
const yellow = { background: "rgba(245,158,11,0.12)", color: "#92400e" };
const red = { background: "rgba(239,68,68,0.12)", color: "#991b1b" };

const empty = { color: "#64748b", marginTop: 10 };
