import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

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
import PlayerLookup from "./PlayerLookup";

// 🔥 NEW
import UserManagement from "./UserManagement";

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

  const [divisionCounts, setDivisionCounts] = useState({});

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

    const { data: playersWithDiv } = await supabase
      .from("players")
      .select("division_id, divisions(name)");

    const counts = {};
    (playersWithDiv || []).forEach(p => {
      const name = p.divisions?.name || "Unassigned";
      counts[name] = (counts[name] || 0) + 1;
    });

    setDivisionCounts(counts);

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
    <>
      {/* HOME */}
      {adminPage === "dashboard" && (
        <>
          <h1 style={{ marginTop: 0 }}>Home</h1>
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

      {/* LOOKUP */}
      {adminPage === "lookup" && <PlayerLookup />}

      {/* USERS (NEW) */}
      {adminPage === "users" && <UserManagement />}

      {/* MORE */}
      {adminPage === "more" && (
        <>
          <h2>More</h2>
          <div style={moreGrid}>
            <MoreBtn label="Users" onClick={() => setAdminPage("users")} />
            <MoreBtn label="Players" onClick={() => setAdminPage("players")} />
            <MoreBtn label="Coaches" onClick={() => setAdminPage("coaches")} />
            <MoreBtn label="Referees" onClick={() => setAdminPage("referees")} />
            <MoreBtn label="Reports" onClick={() => setAdminPage("reports")} />
            <MoreBtn label="Settings" onClick={() => setAdminPage("settings")} />
          </div>
        </>
      )}

      {/* PAGES */}
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
    </>
  );
}

/* STYLES */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 20,
  marginTop: 25
};

const moreGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 20
};

function StatTile({ title, value, color = "#2f6ea6" }) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: 16,
      padding: 20,
      boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
    }}>
      <div style={{ fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "700", color }}>
        {value}
      </div>
    </div>
  );
}

function MoreBtn({ label, onClick }) {
  return (
    <div onClick={onClick} style={card}>
      {label}
    </div>
  );
}

const card = {
  padding: 20,
  background: "#fff",
  borderRadius: 12,
  textAlign: "center",
  cursor: "pointer"
};
