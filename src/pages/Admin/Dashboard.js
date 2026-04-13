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

            {["K-1","2nd-3rd","4th-5th","6th-8th"].map(name => (
              <StatTile
                key={name}
                title={`${name} Players`}
                value={divisionCounts[name] || 0}
                color="#6366f1"
              />
            ))}
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
