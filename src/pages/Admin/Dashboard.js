import React from "react";

export default function Dashboard({ setPage }) {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
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

        <button style={navBtn(true)} onClick={() => setPage("dashboard")}>
          Dashboard
        </button>

        {/* ✅ ADDED / RENAMED */}
        <button
          style={navBtn()}
          onClick={() => setPage("scoreManager")}
        >
          Scoreboard Manager
        </button>

        <button style={navBtn()}>Schedule</button>
        <button style={navBtn()}>Teams</button>
        <button style={navBtn()}>Reports</button>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div
        style={{
          flex: 1,
          padding: 25,
          overflowY: "auto",
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 25 }}>
          <h1 style={{ marginBottom: 5 }}>Dashboard</h1>
          <p style={{ color: "#64748b" }}>
            League overview and quick actions
          </p>
        </div>

        {/* ================= STATS ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginBottom: 25,
          }}
        >
          <StatCard title="Games Today" value="12" color="#22c55e" />
          <StatCard title="Active Teams" value="24" color="#3b82f6" />
          <StatCard title="Scores Entered" value="8" color="#f97316" />
          <StatCard title="Pending Games" value="4" color="#ef4444" />
        </div>

        {/* ================= ACTION CARDS ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          <ActionCard
            title="Score Manager"
            desc="Enter and update game scores"
            onClick={() => setPage("scoreManager")}
          />

          <ActionCard
            title="Schedule Manager"
            desc="View and edit game schedules"
          />

          <ActionCard
            title="Team Management"
            desc="Manage teams and rosters"
          />

          <ActionCard
            title="Reports"
            desc="View league stats and exports"
          />
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

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

function StatCard({ title, value, color }) {
  return (
    <div
      style={{
        background: "#ffffff",
        padding: 20,
        borderRadius: 16,
        borderLeft: `6px solid ${color}`,
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
      }}
    >
      <p style={{ color: "#64748b", marginBottom: 5 }}>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

function ActionCard({ title, desc, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#ffffff",
        padding: 20,
        borderRadius: 16,
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        transition: "0.2s",
      }}
    >
      <h3 style={{ marginBottom: 10 }}>{title}</h3>
      <p style={{ color: "#64748b" }}>{desc}</p>
    </div>
  );
}
