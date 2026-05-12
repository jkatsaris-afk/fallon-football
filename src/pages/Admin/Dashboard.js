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
import Divisions from "./FieldManagerPages/Divisions";
import ReportsPage from "./ReportsPage";
import AdminSettings from "./AdminSettings";
import BoardMembersPage from "./BoardMembersPage";
import PlayerLookup from "./PlayerLookup";
import ChampionshipMatchupsPage from "./GameManagerPages/ChampionshipMatchupsPage";
import LiveScoreboardPage from "./GameManagerPages/LiveScoreboardPage";
import ComplaintsManager from "./ComplaintsManager";
import { applyPersonSeasonFilter, applyUuidSeasonFilter, getActiveSeason } from "../../utils/season";

export default function Dashboard({
  adminPage,
  setAdminPage
}) {
  const [stats, setStats] = useState({
    players: 0,
    games: 0,
    scoredGames: 0,
    liveGames: 0,
    championshipGames: 0,
    coachesApproved: 0,
    coachesPending: 0,
    refsApproved: 0,
    refsPending: 0,
    scheduledGames: 0,
    matchups: 0,
    teams: 0,
    fields: 0,
    unassignedPlayers: 0,
    complaints: 0,
    openComplaints: 0,
    currentSeason: "2026",
  });

  const [divisionCounts, setDivisionCounts] = useState({});
  const [ageCounts, setAgeCounts] = useState({});
  const [unassignedDivisionCounts, setUnassignedDivisionCounts] = useState({});

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const active = await getActiveSeason();

    const { count: playerCount } = await applyPersonSeasonFilter(supabase
      .from("players")
      .select("*", { count: "exact", head: true }), active);

    const { count: gameCount } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*", { count: "exact", head: true })
      .ilike("event_type", "%game%"), active);

    const { count: championshipCount } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*", { count: "exact", head: true })
      .ilike("event_type", "%champ%"), active);

    const { count: scoredGameCount } = await supabase
      .from("game_scores")
      .select("*", { count: "exact", head: true });

    const { count: liveGameCount } = await supabase
      .from("games_live")
      .select("*", { count: "exact", head: true })
      .eq("status", "live");

    const { count: coachApproved } = await applyPersonSeasonFilter(supabase
      .from("coaches")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"), active);

    const { count: coachPending } = await applyPersonSeasonFilter(supabase
      .from("coaches")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"), active);

    const { count: refApproved } = await applyPersonSeasonFilter(supabase
      .from("referees")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"), active);

    const { count: refPending } = await applyPersonSeasonFilter(supabase
      .from("referees")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"), active);

    const { count: scheduledGames } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*", { count: "exact", head: true }), active);

    const { count: matchupCount } = await supabase
      .from("matchups")
      .select("*", { count: "exact", head: true });

    const { count: teamCount } = await applyPersonSeasonFilter(supabase
      .from("teams")
      .select("*", { count: "exact", head: true }), active);

    const { count: fieldCount } = await supabase
      .from("fields")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const { count: complaintCount } = await supabase
      .from("complaints")
      .select("*", { count: "exact", head: true });

    const { count: openComplaintCount } = await supabase
      .from("complaints")
      .select("*", { count: "exact", head: true })
      .neq("status", "closed");

    const { data: playersWithDiv } = await applyPersonSeasonFilter(supabase
      .from("players")
      .select("division_id, team_id, age, divisions(name)"), active);

    const counts = {};
    const ageMap = {};
    const unassignedMap = {};
    let unassignedTotal = 0;

    (playersWithDiv || []).forEach(p => {
      const name = p.divisions?.name || "Unassigned";
      counts[name] = (counts[name] || 0) + 1;

      const ageKey = Number.isFinite(Number(p.age)) ? String(Number(p.age)) : "Unknown";
      ageMap[ageKey] = (ageMap[ageKey] || 0) + 1;

      if (!p.team_id) {
        unassignedTotal += 1;
        unassignedMap[name] = (unassignedMap[name] || 0) + 1;
      }
    });

    setDivisionCounts(counts);
    setAgeCounts(ageMap);
    setUnassignedDivisionCounts(unassignedMap);

    setStats({
      players: playerCount || 0,
      games: gameCount || 0,
      scoredGames: scoredGameCount || 0,
      liveGames: liveGameCount || 0,
      championshipGames: championshipCount || 0,
      coachesApproved: coachApproved || 0,
      coachesPending: coachPending || 0,
      refsApproved: refApproved || 0,
      refsPending: refPending || 0,
      scheduledGames: scheduledGames || 0,
      matchups: matchupCount || 0,
      teams: teamCount || 0,
      fields: fieldCount || 0,
      unassignedPlayers: unassignedTotal,
      complaints: complaintCount || 0,
      openComplaints: openComplaintCount || 0,
      currentSeason: active.seasonLabel || "2026",
    });
  };

  return (
    <>
      {/* HOME */}
      {adminPage === "dashboard" && (
        <div style={pageWrap}>
          <div>
            <h1 style={title}>Season Overview</h1>
            <div style={subtitle}>
              {stats.currentSeason} season snapshot, setup status, and quick access to league tools.
            </div>
          </div>

          <div style={tileGrid}>
            <OverviewTile title="Players" value={stats.players} text="Registered players" />
            <OverviewTile title="Teams" value={stats.teams} text="Created team records" />
            <OverviewTile title="Schedule" value={stats.scheduledGames} text={`${stats.games} games on schedule`} />
            <OverviewTile title="Scores" value={stats.scoredGames} text="Final scores entered" />
            <OverviewTile title="Live Games" value={stats.liveGames} text="Currently active scoreboards" tone={stats.liveGames ? "live" : "neutral"} />
            <OverviewTile title="Championships" value={stats.championshipGames} text="Championship schedule rows" />
            <OverviewTile title="Unassigned" value={stats.unassignedPlayers} text="Players not on a team" tone={stats.unassignedPlayers ? "warn" : "good"} />
            <OverviewTile title="Complaints" value={stats.complaints} text={`${stats.openComplaints} open this season`} tone={stats.openComplaints ? "warn" : "good"} />
            <OverviewTile title="Coaches" value={stats.coachesApproved} text={`${stats.coachesPending} pending approval`} tone={stats.coachesPending ? "warn" : "good"} />
            <OverviewTile title="Referees" value={stats.refsApproved} text={`${stats.refsPending} pending approval`} tone={stats.refsPending ? "warn" : "good"} />
          </div>

          <section style={section}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionTitle}>Season Setup</div>
                <div style={sectionSub}>Open a manager from the tiles below or use the navigation above.</div>
              </div>
            </div>

            <div style={quickGrid}>
              <QuickTile title="Divisions" text="Set league divisions" onClick={() => setAdminPage("divisions")} />
              <QuickTile title="Board Members" text="Public board contacts and roles" onClick={() => setAdminPage("board")} />
              <QuickTile title="Teams" text="Build teams and view rankings" onClick={() => setAdminPage("teams")} />
              <QuickTile title="Players" text="Review players and ratings" onClick={() => setAdminPage("players")} />
              <QuickTile title="Schedule" text="Create regular season weeks" onClick={() => setAdminPage("schedule")} />
              <QuickTile title="Scoreboard" text="Control live boards and devices" onClick={() => setAdminPage("scoreboard")} />
              <QuickTile title="Score Manager" text="Scores, records, and team stats" onClick={() => setAdminPage("games")} />
              <QuickTile title="Championships" text="Seeds, brackets, and schedule" onClick={() => setAdminPage("championships")} />
              <QuickTile title="Fields" text={`${stats.fields} active fields`} onClick={() => setAdminPage("fields")} />
              <QuickTile title="Reports" text="County and league reports" onClick={() => setAdminPage("reports")} />
            </div>
          </section>

          <section style={section}>
            <div style={sectionTitle}>Players By Division</div>
            <div style={divisionGrid}>
              {Object.entries(divisionCounts).map(([division, count]) => (
                <div key={division} style={divisionCard}>
                  <div style={divisionName}>{division}</div>
                  <div style={divisionValue}>{count}</div>
                </div>
              ))}
            </div>
            {!Object.keys(divisionCounts).length && (
              <div style={emptyText}>No division player counts found yet.</div>
            )}
          </section>

          <section style={section}>
            <div style={sectionTitle}>Players By Age</div>
            <div style={divisionGrid}>
              {sortAgeEntries(ageCounts).map(([age, count]) => (
                <div key={age} style={divisionCard}>
                  <div style={divisionName}>{age === "Unknown" ? "Age Unknown" : `Age ${age}`}</div>
                  <div style={divisionValue}>{count}</div>
                </div>
              ))}
            </div>
            {!Object.keys(ageCounts).length && (
              <div style={emptyText}>No player age counts found yet.</div>
            )}
          </section>

          <section style={section}>
            <div style={sectionHeader}>
              <div>
                <div style={sectionTitle}>Players Not Assigned To Teams</div>
                <div style={sectionSub}>{stats.unassignedPlayers} players still need a team assignment.</div>
              </div>
              <button type="button" style={smallActionBtn} onClick={() => setAdminPage("players")}>
                Open Player Manager
              </button>
            </div>
            <div style={divisionGrid}>
              {Object.entries(unassignedDivisionCounts).map(([division, count]) => (
                <div key={division} style={divisionCard}>
                  <div style={divisionName}>{division}</div>
                  <div style={divisionValue}>{count}</div>
                </div>
              ))}
            </div>
            {!Object.keys(unassignedDivisionCounts).length && (
              <div style={emptyText}>Every active player is assigned to a team.</div>
            )}
          </section>
        </div>
      )}

      {/* LOOKUP */}
      {adminPage === "lookup" && <PlayerLookup />}

      {/* MORE */}
      {adminPage === "more" && (
        <div style={pageWrap}>
          <div>
            <h2 style={title}>More</h2>
            <div style={subtitle}>All admin tools in one place.</div>
          </div>
          <div style={moreGrid}>
            <MoreBtn label="Division Manager" onClick={() => setAdminPage("divisions")} />
            <MoreBtn label="Board Members" onClick={() => setAdminPage("board")} />
            <MoreBtn label="Team Manager" onClick={() => setAdminPage("teams")} />
            <MoreBtn label="Player Manager" onClick={() => setAdminPage("players")} />
            <MoreBtn label="Matchup Manager" onClick={() => setAdminPage("matchups")} />
            <MoreBtn label="Schedule Manager" onClick={() => setAdminPage("schedule")} />
            <MoreBtn label="Scoreboard" onClick={() => setAdminPage("scoreboard")} />
            <MoreBtn label="Score Manager" onClick={() => setAdminPage("games")} />
            <MoreBtn label="Championships" onClick={() => setAdminPage("championships")} />
            <MoreBtn label="Field Manager" onClick={() => setAdminPage("fields")} />
            <MoreBtn label="Coach Manager" onClick={() => setAdminPage("coaches")} />
            <MoreBtn label="Complaints" onClick={() => setAdminPage("complaints")} />
            <MoreBtn label="Referee Manager" onClick={() => setAdminPage("referees")} />
            <MoreBtn label="Report Manager" onClick={() => setAdminPage("reports")} />
            <MoreBtn label="Settings" onClick={() => setAdminPage("settings")} />
          </div>
        </div>
      )}

      {/* PAGES */}
      {adminPage === "teams" && <TeamsPage />}
      {adminPage === "board" && <BoardMembersPage />}
      {adminPage === "players" && <PlayerManager />}
      {adminPage === "schedule" && <ScheduleManager />}
      {adminPage === "scoreboard" && <LiveScoreboardPage />}
      {adminPage === "games" && <GameManager />}
      {adminPage === "championships" && <ChampionshipMatchupsPage />}
      {adminPage === "matchups" && <MatchupManager />}
      {adminPage === "divisions" && <Divisions />}
      {adminPage === "fields" && <FieldManager />}
      {adminPage === "coaches" && <CoachManager />}
      {adminPage === "complaints" && <ComplaintsManager />}
      {adminPage === "referees" && <RefereeManager />}
      {adminPage === "reports" && <ReportsPage />}
      {adminPage === "settings" && <AdminSettings />}
    </>
  );
}

/* STYLES */

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const title = {
  color: "#0f172a",
  fontSize: 28,
  fontWeight: 900,
  margin: 0,
};

const subtitle = {
  color: "#64748b",
  fontSize: 14,
  fontWeight: 700,
  marginTop: 6,
};

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const moreGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
};

function OverviewTile({ title, value, text, tone = "neutral" }) {
  const toneStyle = tone === "good"
    ? goodTile
    : tone === "warn"
      ? warnTile
      : tone === "live"
        ? liveTile
        : {};

  return (
    <div style={{ ...overviewTile, ...toneStyle }}>
      <div style={overviewLabel}>{title}</div>
      <div style={overviewValue}>{value}</div>
      <div style={overviewText}>{text}</div>
    </div>
  );
}

function QuickTile({ title, text, onClick }) {
  return (
    <button type="button" style={quickTile} onClick={onClick}>
      <div style={quickTitle}>{title}</div>
      <div style={quickText}>{text}</div>
    </button>
  );
}

function MoreBtn({ label, onClick }) {
  return (
    <div onClick={onClick} style={card}>
      {label}
    </div>
  );
}

function sortAgeEntries(counts) {
  return Object.entries(counts).sort(([ageA], [ageB]) => {
    if (ageA === "Unknown") return 1;
    if (ageB === "Unknown") return -1;
    return Number(ageA) - Number(ageB);
  });
}

const card = {
  padding: 20,
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  textAlign: "center",
  cursor: "pointer",
  fontWeight: 850,
};

const overviewTile = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  padding: 16,
};

const goodTile = { background: "#f0fdf4", borderColor: "#86efac" };
const warnTile = { background: "#fffbeb", borderColor: "#fde68a" };
const liveTile = { background: "#eff6ff", borderColor: "#93c5fd" };
const overviewLabel = { color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const overviewValue = { color: "#0f172a", fontSize: 32, fontWeight: 950, marginTop: 4 };
const overviewText = { color: "#64748b", fontSize: 12, fontWeight: 750, marginTop: 3 };

const section = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  padding: 18,
};

const sectionHeader = {
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const sectionTitle = { color: "#0f172a", fontSize: 18, fontWeight: 900 };
const sectionSub = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 3 };

const quickGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
};

const quickTile = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  cursor: "pointer",
  padding: 14,
  textAlign: "left",
};

const quickTitle = { color: "#0f172a", fontSize: 15, fontWeight: 900 };
const quickText = { color: "#64748b", fontSize: 12, fontWeight: 700, marginTop: 5 };

const smallActionBtn = {
  background: "#0f172a",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
  padding: "10px 12px",
};

const divisionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  marginTop: 12,
};

const divisionCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
};

const divisionName = { color: "#334155", fontSize: 13, fontWeight: 900 };
const divisionValue = { color: "#0f172a", fontSize: 26, fontWeight: 950, marginTop: 4 };
const emptyText = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 12 };
