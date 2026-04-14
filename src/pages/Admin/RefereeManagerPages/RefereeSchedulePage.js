import React from "react";

export default function RefereeSchedulePage() {
  return (
    <div style={card}>
      <h2 style={heading}>Referee Schedules</h2>
      <div style={muted}>
        This section will show referee game assignments and open slots.
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
  marginBottom: 12,
  fontSize: "22px",
  color: "#0f172a",
};

const muted = {
  color: "#64748b",
};
