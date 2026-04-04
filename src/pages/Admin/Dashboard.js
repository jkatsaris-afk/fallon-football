import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import ScoreboardManager from "./ScoreboardManager";
import GameSelector from "./GameSelector";
import TeamsPage from "./TeamsPage";

// ✅ SETTINGS PAGE
import AdminSettings from "./AdminSettings";

export default function Dashboard({
  adminPage,
  setAdminPage
}) {
  const [stats, setStats] = useState({
    players: 0,
    games: 0
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { count: playerCount } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    const { count: gameCount } = await supabase
      .from("schedule_master")
      .select("*", { count: "exact", head: true })
      .ilike("event_type", "%game%");

    setStats({
      players: playerCount || 0,
      games: gameCount || 0
    });
  };

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

        <button
          style={navBtn(adminPage === "gameSelector")}
          onClick={() => setAdminPage("gameSelector")}
        >
          Game Selector
        </button>

        <button
          style={navBtn(adminPage === "teams")}
          onClick={() => setAdminPage("teams")}
        >
          Teams
        </button>

        <button style={navBtn(false)}>Schedule</button>
        <button style={navBtn(false)}>Reports</button>

        {/* ================= SETTINGS SECTION ================= */}
        <div style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
          SETTINGS
        </div>

        <button
          style={navBtn(adminPage === "settings")}
          onClick={() => setAdminPage("settings")}
        >
          Settings
        </button>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div style={{ flex: 1, padding: 25, overflow: "hidden" }}>

        {/* ===== DASHBOARD ===== */}
        {adminPage === "dashboard" && (
          <>
            <h1>Dashboard</h1>
            <p style={{ color: "#64748b" }}>
              League overview and quick actions
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 20,
                marginTop: 25
              }}
            >
              <StatTile title="Players" value={stats.players} />
              <StatTile title="Games" value={stats.games} />
            </div>
          </>
        )}

        {/* ===== SCOREBOARD ===== */}
        {adminPage === "scoreManager" && (
          <ScoreboardManager />
        )}

        {/* ===== GAME SELECTOR ===== */}
        {adminPage === "gameSelector" && (
          <GameSelector />
        )}

        {/* ===== TEAMS ===== */}
        {adminPage === "teams" && (
          <TeamsPage />
        )}

        {/* ===== SETTINGS (NEW) ===== */}
        {adminPage === "settings" && (
          <AdminSettings />
        )}

      </div>
    </div>
  );
}

/* ================= TILE ================= */

function StatTile({ title, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center"
      }}
    >
      <div style={{ fontSize: 14, color: "#64748b" }}>{title}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: "700",
          marginTop: 5
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ================= NAV BUTTON ================= */

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
