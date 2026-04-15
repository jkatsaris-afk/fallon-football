import React from "react";

export default function AutoAssignPage({ setAdminPage }) {
  return (
    <div style={{ padding: 20 }}>

      <h2>Auto Assign Workflow</h2>

      <p>This is where your workflow will go.</p>

      {/* 🔥 BACK BUTTON */}
      <button
        onClick={() => setAdminPage("referees")}
        style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 10,
          background: "#2563eb",
          color: "#fff",
          border: "none",
          cursor: "pointer"
        }}
      >
        Back to Schedule
      </button>

    </div>
  );
}
