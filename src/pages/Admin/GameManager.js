import React, { useEffect, useMemo, useState } from "react";
import ScoreManagementPage from "./GameManagerPages/ScoreManagementPage";
import ScoreRecordsPage from "./GameManagerPages/ScoreRecordsPage";
import LiveScoreboardPage from "./GameManagerPages/LiveScoreboardPage";
import ChampionshipMatchupsPage from "./GameManagerPages/ChampionshipMatchupsPage";
import { supabase } from "../../supabase";

import Logo49ers from "../../resources/San Francisco 49ers.png";
import LogoBengals from "../../resources/Cincinnati Bengals.png";
import LogoBills from "../../resources/Buffalo Bills.png";
import LogoBroncos from "../../resources/Denver Broncos.png";
import LogoChiefs from "../../resources/Kansas City Chiefs.png";
import LogoColts from "../../resources/Indianapolis Colts.png";
import LogoEagles from "../../resources/Philadelphia Eagles.png";
import LogoJets from "../../resources/New York Jets.png";
import LogoLions from "../../resources/Detroit Lions.png";
import LogoRaiders from "../../resources/Las Vegas Raiders.png";
import LogoRams from "../../resources/Los Angeles Rams.png";
import LogoRavens from "../../resources/Baltimore Ravens.png";
import LogoSteelers from "../../resources/Pittsburgh Steelers.png";

const TEAM_LOGOS = {
  "49ers": Logo49ers,
  Bengals: LogoBengals,
  Bills: LogoBills,
  Broncos: LogoBroncos,
  Chiefs: LogoChiefs,
  Colts: LogoColts,
  Eagles: LogoEagles,
  Jets: LogoJets,
  Lions: LogoLions,
  Raiders: LogoRaiders,
  Rams: LogoRams,
  Ravens: LogoRavens,
  Steelers: LogoSteelers,
};

export default function GameManager() {
  const [view, setView] = useState("dashboard");
  const [schedule, setSchedule] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    loadGameOverview();
  }, []);

  const loadGameOverview = async () => {
    const { data: scheduleData } = await supabase
      .from("schedule_master_auto")
      .select("id, division, team, opponent, event_type");

    const { data: scoreData } = await supabase
      .from("game_scores")
      .select("schedule_id, home_team, away_team, home_score, away_score");

    setSchedule(scheduleData || []);
    setScores(scoreData || []);
  };

  const scheduleById = useMemo(() => {
    const map = {};
    schedule.forEach((game) => {
      map[game.id] = game;
    });
    return map;
  }, [schedule]);

  const teamCards = useMemo(() => {
    const map = {};

    const ensureTeam = (name, division) => {
      const cleanName = cleanTeamName(name);
      if (!cleanName) return null;

      const cleanDivision = normalizeDivision(division);
      const key = `${cleanDivision}_${cleanName}`;

      if (!map[key]) {
        map[key] = {
          team: cleanName,
          division: cleanDivision,
          scheduled: 0,
          played: 0,
        };
      }

      return map[key];
    };

    schedule
      .filter((game) => isGameEvent(game.event_type))
      .forEach((game) => {
        const home = ensureTeam(game.team, game.division);
        const away = ensureTeam(game.opponent, game.division);
        if (home) home.scheduled += 1;
        if (away) away.scheduled += 1;
      });

    scores.forEach((score) => {
      const game = scheduleById[score.schedule_id];
      if (!game || !isGameEvent(game.event_type)) return;
      if (!hasFinalScore(score)) return;

      const home = ensureTeam(score.home_team, game.division);
      const away = ensureTeam(score.away_team, game.division);
      if (home) home.played += 1;
      if (away) away.played += 1;
    });

    return Object.values(map).sort((a, b) => {
      const divisionSort = sortDivisions(a.division, b.division);
      if (divisionSort !== 0) return divisionSort;
      return a.team.localeCompare(b.team);
    });
  }, [schedule, scores, scheduleById]);

  const teamsByDivision = useMemo(() => {
    return teamCards.reduce((groups, team) => {
      if (!groups[team.division]) groups[team.division] = [];
      groups[team.division].push(team);
      return groups;
    }, {});
  }, [teamCards]);

  const renderSelectedPage = () => {
    try {
      switch (view) {
        case "score":
          return <ScoreManagementPage />;

        case "records":
          return <ScoreRecordsPage />;

        case "live":
          return <LiveScoreboardPage />;

        case "championship":
          return <ChampionshipMatchupsPage />;

        default:
          return (
            <div style={contentWrap}>
              <div style={overviewHeader}>
                <div>
                  <div style={emptyTitle}>Team Game Overview</div>
                  <div style={emptyText}>
                    Games played are based on final scores. Scheduled games are pulled from the schedule.
                  </div>
                </div>
                <button style={refreshBtn} onClick={loadGameOverview}>Refresh</button>
              </div>

              {Object.entries(teamsByDivision).map(([division, teams]) => (
                <section key={division} style={divisionSection}>
                  <div style={divisionHeader}>
                    <div>
                      <div style={divisionTitle}>{division}</div>
                      <div style={divisionSub}>{teams.length} teams</div>
                    </div>
                  </div>

                  <div style={teamGrid}>
                    {teams.map((team) => (
                      <div key={`${team.division}_${team.team}`} style={teamCard}>
                        <div style={teamTopRow}>
                          {TEAM_LOGOS[team.team] && (
                            <img src={TEAM_LOGOS[team.team]} alt="" style={teamLogo} />
                          )}
                          <div>
                            <div style={teamCardName}>{team.team}</div>
                            <div style={divisionBadge}>{team.division}</div>
                          </div>
                        </div>

                        <div style={gameCountRow}>
                          <CountBox label="Played" value={team.played} />
                          <CountBox label="Scheduled" value={team.scheduled} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {!teamCards.length && (
                <div style={emptyStateCard}>
                  <div style={emptyText}>No scheduled games found yet.</div>
                </div>
              )}
            </div>
          );
      }
    } catch (err) {
      console.error("Game Manager crash:", err);
      return (
        <div style={{ padding: 20, color: "red" }}>
          ⚠️ Page crashed — check console
        </div>
      );
    }
  };

  return (
    <div style={pageWrap}>

      <div style={topSection}>

        <div style={titleRow}>
          <div>
            <h1 style={title}>Game Manager</h1>
            <div style={subtitle}>
              Manage scoring, live games, records, and championship seeds.
            </div>
          </div>
        </div>

        <div style={tileGrid}>
          <ManagerTile
            title="Score Management"
            desc="Start and manage game scoring"
            active={view === "score"}
            onClick={() => setView("score")}
          />

          <ManagerTile
            title="Score Records"
            desc="View completed game results"
            active={view === "records"}
            onClick={() => setView("records")}
          />

          <ManagerTile
            title="Live Scoreboard"
            desc="Control live game scoring"
            active={view === "live"}
            onClick={() => setView("live")}
          />

          <ManagerTile
            title="Championship Matchups"
            desc="Calculate seeds by division"
            active={view === "championship"}
            onClick={() => setView("championship")}
          />
        </div>

      </div>

      {renderSelectedPage()}
    </div>
  );
}

/* 🔥 MATCHED TILE COMPONENT */
function ManagerTile({ title, desc, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tile,
        ...(active ? activeTile : {}),
      }}
    >
      <div style={tileTitle}>{title}</div>
      <div style={tileDesc}>{desc}</div>
    </button>
  );
}

function CountBox({ label, value }) {
  return (
    <div style={countBox}>
      <div style={countValue}>{value}</div>
      <div style={countLabel}>{label}</div>
    </div>
  );
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function normalizeDivision(value) {
  const division = (value || "Unknown").toString().trim();
  if (!division) return "Unknown";
  const compact = division.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (compact === "k1" || compact === "k1st") return "K-1";
  if (compact.includes("2") && compact.includes("3")) return "2nd-3rd";
  if (compact.includes("4") && compact.includes("5")) return "4th-5th";
  if (compact.includes("6") || compact.includes("7") || compact.includes("8")) return "6th-8th";

  return division;
}

function sortDivisions(a, b) {
  const order = ["K-1", "2nd-3rd", "4th-5th", "6th-8th", "Unknown"];
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);
  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
  }
  return a.localeCompare(b);
}

function isGameEvent(value) {
  const type = (value || "").toLowerCase();
  return type.includes("game") && !type.includes("practice");
}

function hasFinalScore(score) {
  return (
    score.home_score !== null &&
    score.home_score !== undefined &&
    score.away_score !== null &&
    score.away_score !== undefined
  );
}

/* 🔥 STYLES (COPIED 1:1 STYLE SYSTEM) */

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const topSection = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const titleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
};

const subtitle = {
  marginTop: 6,
  color: "#64748b",
  fontSize: "14px",
};

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const tile = {
  textAlign: "left",
  border: "none",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  minHeight: 100,
};

const activeTile = {
  outline: "2px solid #16a34a",
  boxShadow: "0 10px 28px rgba(22, 163, 74, 0.16)",
};

const tileTitle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
};

const tileDesc = {
  marginTop: 8,
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.4,
};

const contentWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const overviewHeader = {
  alignItems: "center",
  background: "#ffffff",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  padding: 20,
};

const emptyStateCard = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const emptyTitle = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#0f172a",
};

const emptyText = {
  marginTop: 8,
  color: "#64748b",
  fontSize: "14px",
};

const refreshBtn = {
  background: "#16a34a",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 800,
  padding: "10px 12px",
};

const divisionSection = {
  background: "#ffffff",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  padding: 16,
};

const divisionHeader = {
  alignItems: "center",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 14,
  paddingBottom: 12,
};

const divisionTitle = {
  color: "#0f172a",
  fontSize: 18,
  fontWeight: 900,
};

const divisionSub = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  marginTop: 2,
};

const teamGrid = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const teamCard = {
  background: "#ffffff",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  padding: 16,
};

const teamTopRow = {
  alignItems: "center",
  display: "flex",
  gap: 12,
};

const teamLogo = {
  height: 42,
  objectFit: "contain",
  width: 42,
};

const teamCardName = {
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 800,
};

const divisionBadge = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 800,
  marginTop: 2,
};

const gameCountRow = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "1fr 1fr",
  marginTop: 14,
};

const countBox = {
  background: "#f8fafc",
  borderRadius: 12,
  padding: 12,
  textAlign: "center",
};

const countValue = {
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 900,
};

const countLabel = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 800,
  marginTop: 2,
  textTransform: "uppercase",
};
