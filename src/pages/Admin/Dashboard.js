import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

// ✅ ADD THIS (adjust path if needed)
import fallonLogo from "../../assets/fallon-flag.png";

// IMPORTS
import GameManager from "./GameManager";
import ScheduleManager from "./ScheduleManager";
import TeamsPage from "./TeamsPage";
import PlayerManager from "./PlayerManager";
import CoachManager from "./CoachManager";
import MatchupManager from "./MatchupManager";
import RefereeManager from "./RefereeManager";
import FieldManager from "./FieldManager";
import ReportsPage from "./ReportsPage";
import AdminSettings from "./AdminSettings";

export default function Dashboard({
  adminPage,
  setAdminPage
}) {
  const [stats, setStats] = useState({
    players: 0,
    games: 0,
    coachesApproved: 0,
    coachesPending: 0,
    refsApproved: 0,
    refsPending: 0,
    scheduledGames: 0,
    matchups: 0
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

    const { count: coachApproved } = await supabase
      .from("coaches")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    const { count: coachPending } = await supabase
      .from("coaches")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: refApproved } = await supabase
      .from("referees")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    const { count: refPending } = await supabase
      .from("referees")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: scheduledGames } = await supabase
      .from("schedule_master_auto")
      .select("*", { count: "exact", head: true });

    const { count: matchupCount } = await supabase
      .from("matchups")
      .select("*", { count: "exact", head: true });

    setStats({
      players: playerCount || 0,
      games: gameCount || 0,
      coachesApproved: coachApproved || 0,
      coachesPending: coachPending || 0,
      refsApproved: refApproved || 0,
      refsPending: refPending || 0,
      scheduledGames: scheduledGames || 0,
      matchups: matchupCount || 0
    });
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>

      {/* ================= SIDEBAR ================= */}
      <div style={sidebar}>

        {/* ✅ UPDATED HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <img
            src={fallonLogo}
            alt="Fallon Flag"
            style={{ width: 32, height: 32, objectFit: "contain" }}
          />
          <h2 style={{ margin: 0 }}>Admin</h2>
        </div>

        <NavBtn active={adminPage === "dashboard"} onClick={() => setAdminPage("dashboard")} label="Dashboard" />
        <NavBtn active={adminPage === "teams"} onClick={() => setAdminPage("teams")} label="Team Manager" />
        <NavBtn active={adminPage === "players"} onClick={() => setAdminPage("players")} label="Player Manager" />
        <NavBtn active={adminPage === "matchups"} onClick={() => setAdminPage("matchups")} label="Matchup Manager" />
        <NavBtn active={adminPage === "fields"} onClick={() => setAdminPage("fields")} label="Field Manager" />
        <NavBtn active={adminPage === "schedule"} onClick={() => setAdminPage("schedule")} label="Schedule Manager" />
        <NavBtn active={adminPage === "games"} onClick={() => setAdminPage("games")} label="Game Manager" />
        <NavBtn active={adminPage === "coaches"} onClick={() => setAdminPage("coaches")} label="Coach Manager" />
        <NavBtn active={adminPage === "referees"} onClick={() => setAdminPage("referees")} label="Referee Manager" />
        <NavBtn active={adminPage === "reports"} onClick={() => setAdminPage("reports")} label="Reports" />

        <div style={settingsHeader}>SETTINGS</div>
        <NavBtn active={adminPage === "settings"} onClick={() => setAdminPage("settings")} label="Settings" />
      </div>

      {/* ================= CONTENT ================= */}
      <div style={{ flex: 1, padding: 25, overflow: "auto" }}>

        {adminPage === "dashboard" && (
          <>
            <h1>Dashboard</h1>
            <p style={{ color: "#64748b" }}>
              League overview and quick actions
            </p>

            <div style={grid}>
              <StatTile title="Players" value={stats.players} />
              <StatTile title="Games" value={stats.games} />

              <StatTile title="Approved Coaches" value={stats.coachesApproved} color="#16a34a" />
              <StatTile title="Pending Coaches" value={stats.coachesPending} color="#f59e0b" />

              <StatTile title="Approved Referees" value={stats.refsApproved} color="#16a34a" />
              <StatTile title="Pending Referees" value={stats.refsPending} color="#f59e0b" />

              <StatTile title="Scheduled Games" value={stats.scheduledGames} />
              <StatTile title="Matchups" value={stats.matchups} />
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
        {adminPage === "reports" && <ReportsPage />}
        {adminPage === "settings" && <AdminSettings />}

      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function NavBtn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding: "12px",
      borderRadius: 10,
      border: "none",
      background: active ? "#2f6ea6" : "transparent",
      color: active ? "#fff" : "#0f172a",
      textAlign: "left",
      cursor: "pointer",
      fontWeight: active ? "600" : "500"
    }}>
      {label}
    </button>
  );
}

function StatTile({ title, value, color = "#2f6ea6" }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
    }}>
      <div style={{ fontSize: 14, color: "#64748b" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "700", marginTop: 5, color }}>
        {value}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const sidebar = {
  width: 220,
  background: "#ffffff",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 15,
  borderRight: "1px solid #e5e7eb",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 20,
  marginTop: 25
};

const settingsHeader = {
  marginTop: 20,
  fontSize: 12,
  color: "#94a3b8"
};
