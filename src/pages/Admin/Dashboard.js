import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

// EXISTING IMPORTS
import GameManager from "./GameManager";
import ScheduleManager from "./ScheduleManager";
import TeamsPage from "./TeamsPage";
import PlayerManager from "./PlayerManager";

// NEW IMPORTS
import CoachManager from "./CoachManager";
import MatchupManager from "./MatchupManager";
import RefereeManager from "./RefereeManager";
import FieldManager from "./FieldManager";

// 🔥 ADD THIS
import ReportsPage from "./ReportsPage";

// SETTINGS
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

        <button style={navBtn(adminPage === "dashboard")} onClick={() => setAdminPage("dashboard")}>
          Dashboard
        </button>

        <button style={navBtn(adminPage === "teams")} onClick={() => setAdminPage("teams")}>
          Team Manager
        </button>

        <button style={navBtn(adminPage === "players")} onClick={() => setAdminPage("players")}>
          Player Manager
        </button>

        <button style={navBtn(adminPage === "matchups")} onClick={() => setAdminPage("matchups")}>
          Matchup Manager
        </button>

        <button style={navBtn(adminPage === "fields")} onClick={() => setAdminPage("fields")}>
          Field Manager
        </button>

        <button style={navBtn(adminPage === "schedule")} onClick={() => setAdminPage("schedule")}>
          Schedule Manager
        </button>

        <button style={navBtn(adminPage === "games")} onClick={() => setAdminPage("games")}>
          Game Manager
        </button>

        <button style={navBtn(adminPage === "coaches")} onClick={() => setAdminPage("coaches")}>
          Coach Manager
        </button>

        <button style={navBtn(adminPage === "referees")} onClick={() => setAdminPage("referees")}>
          Referee Manager
        </button>

        {/* 🔥 FIXED REPORTS BUTTON */}
        <button
          style={navBtn(adminPage === "reports")}
          onClick={() => setAdminPage("reports")}
        >
          Reports
        </button>

        {/* SETTINGS */}
        <div style={{ marginTop: 20, fontSize: 12, color: "#94a3b8" }}>
          SETTINGS
        </div>

        <button style={navBtn(adminPage === "settings")} onClick={() => setAdminPage("settings")}>
          Settings
        </button>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div style={{ flex: 1, padding: 25, overflow: "auto" }}>

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

        {adminPage === "teams" && <TeamsPage />}
        {adminPage === "players" && <PlayerManager />}
        {adminPage === "schedule" && <ScheduleManager />}
        {adminPage === "games" && <GameManager />}
        {adminPage === "matchups" && <MatchupManager />}
        {adminPage === "fields" && <FieldManager />}
        {adminPage === "coaches" && <CoachManager />}
        {adminPage === "referees" && <RefereeManager />}
        
        {/* 🔥 ADDED REPORTS PAGE */}
        {adminPage === "reports" && <ReportsPage />}

        {adminPage === "settings" && <AdminSettings />}

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
      <div style={{ fontSize: 28, fontWeight: "700", marginTop: 5 }}>
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
