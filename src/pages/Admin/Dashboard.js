import React from "react";

export default function Dashboard({ setPage }) {
  return (
    <div style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      <div style={{ marginTop: 20, display: "flex", gap: 15 }}>
        <button
          onClick={() => setPage("scoreManager")}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: "#2f6ea6",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Score Manager
        </button>

        {/* future buttons */}
        {/* Schedule Manager, Teams, Reports, etc */}
      </div>
    </div>
  );
}
