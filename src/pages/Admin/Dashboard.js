import React from "react";
import ScoreboardManager from "./ScoreboardManager";
import ViewToggle from "./ViewToggle";

export default function Dashboard({
  adminPage,
  setAdminPage,
  adminView,
  setAdminView
}) {
  return (
    <div style={{ display: "flex", height: "100%" }}>

      {/* ================= SIDEBAR ================= */}
      <div
        style={{
          width: 220,
          background: "#ffffff",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 15,
          borderRight: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ marginBottom: 20 }}>Admin</h2>

        <button
          style={navBtn(adminPage === "dashboard")}
          onClick={() => setAdminPage("dashboard")}
        >
          Dashboard
        </button>

        <button
          style={navBtn(adminPage === "scoreManager")}
          onClick={() => setAdminPage("scoreManager")}
        >
          Scoreboard Manager
        </button>

        <button style={navBtn(false)}>Schedule</button>
        <button style={navBtn(false)}>Teams</button>
        <button style={navBtn(false)}>Reports</button>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div style={{ flex: 1, padding: 25, overflow: "hidden" }}>

        {/* DASHBOARD */}
        {adminPage === "dashboard" && (
          <>
            <h1>Dashboard</h1>
            <p style={{ color: "#64748b" }}>
              League overview and quick actions
            </p>
          </>
        )}

        {/* SCORE MANAGER */}
        {adminPage === "scoreManager" && (
          <>
            <ViewToggle
              adminView={adminView}
              setAdminView={setAdminView}
            />

            <ScoreboardManager adminView={adminView} />
          </>
        )}

      </div>
    </div>
  );
}

function navBtn(active = false) {
  return {
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: active ? "#2f6ea6" : "transparent",
    color: active ? "#fff" : "#0f172a",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: active ? "600" : "500",
  };
}
