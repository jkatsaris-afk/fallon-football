import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";

import bills from "../../resources/Buffalo Bills.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import broncos from "../../resources/Denver Broncos.png";
import lions from "../../resources/Detroit Lions.png";
import colts from "../../resources/Indianapolis Colts.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import jets from "../../resources/New York Jets.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import steelers from "../../resources/Pittsburgh Steelers.png";
import niners from "../../resources/San Francisco 49ers.png";
import ravens from "../../resources/Baltimore Ravens.png";

const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];
const RECENT_SCORE_LIMIT = 8;
const TEAM_LOGOS = {
  bills, bengals, broncos, lions, colts, chiefs, raiders, rams, jets, eagles,
  steelers, ravens, "49ers": niners,
};

export default function ScoreboardPage() {
  const [scores, setScores] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [scheduleById, setScheduleById] = useState({});
  const [search, setSearch] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [showLive, setShowLive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("publicScoreboardView") === "live") {
      setShowLive(true);
      sessionStorage.removeItem("publicScoreboardView");
    }

    loadData();

    const scoreChannel = supabase
      .channel("public-score-results")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, loadData)
      .subscribe();

    const liveChannel = supabase
      .channel("public-live-scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "games_live" }, loadData)
      .subscribe();

    const interval = setInterval(loadData, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(scoreChannel);
      supabase.removeChannel(liveChannel);
    };
  }, []);

  useEffect(() => {
    if (!showLive) return undefined;

    loadLiveData();
    const liveInterval = setInterval(loadLiveData, 1000);
    return () => clearInterval(liveInterval);
  }, [showLive]);

  const loadData = async () => {
    const [{ data: scoreData }, { data: liveData }] = await Promise.all([
      supabase
        .from("game_scores")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("games_live")
        .select("*")
        .in("status", LIVE_GAME_STATUSES)
        .order("created_at", { ascending: false }),
    ]);

    const scheduleIds = [
      ...new Set([
        ...(scoreData || []).map((score) => score.schedule_id),
        ...(liveData || []).map((game) => game.schedule_id),
      ].filter(Boolean)),
    ];

    let nextScheduleById = {};
    if (scheduleIds.length) {
      const { data: scheduleRows } = await supabase
        .from("schedule_master_auto")
        .select("*")
        .in("id", scheduleIds);

      (scheduleRows || []).forEach((game) => {
        nextScheduleById[game.id] = game;
      });
    }

    setScores(scoreData || []);
    setLiveGames((liveData || []).map((game) => ({
      ...game,
      schedule: nextScheduleById[game.schedule_id],
    })));
    setScheduleById(nextScheduleById);
    setLoading(false);
  };

  const loadLiveData = async () => {
    const { data: liveData } = await supabase
      .from("games_live")
      .select("*")
      .in("status", LIVE_GAME_STATUSES)
      .order("created_at", { ascending: false });

    const scheduleIds = [...new Set((liveData || []).map((game) => game.schedule_id).filter(Boolean))];
    let liveScheduleById = {};

    if (scheduleIds.length) {
      const { data: scheduleRows } = await supabase
        .from("schedule_master_auto")
        .select("*")
        .in("id", scheduleIds);

      (scheduleRows || []).forEach((game) => {
        liveScheduleById[game.id] = game;
      });
    }

    setLiveGames((liveData || []).map((game) => ({
      ...game,
      schedule: liveScheduleById[game.schedule_id],
    })));
    setScheduleById((current) => ({ ...current, ...liveScheduleById }));
    setLoading(false);
  };

  const divisionTiles = useMemo(() => {
    const divisions = scores
      .map((score) => normalizeDivision(scheduleById[score.schedule_id]?.division))
      .filter(Boolean);

    return ["all", ...[...new Set(divisions)].sort(sortDivisions)];
  }, [scores, scheduleById]);

  const filteredScores = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scores.filter((score) => {
      const game = scheduleById[score.schedule_id] || {};
      const division = normalizeDivision(game.division);
      if (selectedDivision !== "all" && division !== selectedDivision) return false;
      if (!query) return true;

      const haystack = [
        score.home_team,
        score.away_team,
        score.home_score,
        score.away_score,
        game.division,
        game.week,
        game.field,
        game.event_date,
        game.event_time || game.time,
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });
  }, [scores, scheduleById, search, selectedDivision]);

  const visibleScores = useMemo(() => (
    search.trim() || selectedDivision !== "all"
      ? filteredScores
      : filteredScores.slice(0, RECENT_SCORE_LIMIT)
  ), [filteredScores, search, selectedDivision]);

  const liveCount = liveGames.length;

  if (showLive) {
    return (
      <LiveScoreboardView
        liveGames={liveGames}
        loading={loading}
        onBack={() => setShowLive(false)}
      />
    );
  }

  return (
    <div style={wrap}>
      <div className="card" style={heroCard}>
        <div className="title">Scores</div>
        <div className="sub">Search final scores and check live games from one place.</div>

        <button
          type="button"
          className="button"
          style={{
            ...liveButton,
            ...(liveCount ? liveButtonActive : liveButtonIdle),
          }}
          onClick={() => setShowLive(true)}
        >
          {liveCount ? `Live Scoreboard (${liveCount})` : "Live Scoreboard"}
        </button>
      </div>

      <div className="card" style={panelCard}>
        <div className="title">Recent Scores</div>
        <div className="sub">
          Showing the latest finals. Use a division tile or search to narrow the list.
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search team, division, week, field..."
          style={searchInput}
        />
        <div style={divisionGrid}>
          {divisionTiles.map((division) => (
            <button
              key={division}
              type="button"
              style={{
                ...divisionTile,
                ...(selectedDivision === division ? activeDivisionTile : {}),
              }}
              onClick={() => setSelectedDivision(division)}
            >
              {division === "all" ? "All" : division}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={emptyState}>Loading scores...</div>}

      {!loading && filteredScores.length === 0 && (
        <div style={emptyState}>
          {scores.length ? "No scores match that search." : "No completed scores have been posted yet."}
        </div>
      )}

      {!loading && visibleScores.map((score) => (
        <ScoreTile
          key={score.id}
          score={score}
          game={scheduleById[score.schedule_id]}
        />
      ))}

      {!loading && !search.trim() && selectedDivision === "all" && filteredScores.length > RECENT_SCORE_LIMIT && (
        <div style={emptyState}>
          Showing the {RECENT_SCORE_LIMIT} most recent finals. Search or choose a division to see more.
        </div>
      )}
    </div>
  );
}

function LiveScoreboardView({ liveGames, loading, onBack }) {
  return (
    <div style={livePage}>
      <div style={livePageHeader}>
        <button type="button" style={backButton} onClick={onBack}>
          Scores
        </button>
        <div>
          <div style={livePageTitle}>Live Scoreboard</div>
          <div style={livePageSub}>Scores and time left update automatically.</div>
        </div>
      </div>

      {loading && <div style={liveEmpty}>Loading live scores...</div>}

      {!loading && liveGames.length === 0 && (
        <div style={liveEmpty}>No games are live right now.</div>
      )}

      {!loading && liveGames.map((game) => (
        <LiveGameTile key={game.id} game={game} featured />
      ))}
    </div>
  );
}

function LiveGameTile({ game }) {
  const schedule = game.schedule || {};
  const statusLabel = getLiveStatusLabel(game.status);
  const homeTeam = schedule.team || "Home";
  const awayTeam = schedule.opponent || "Away";

  return (
    <div style={liveScoreCard}>
      <div style={liveCardTop}>
        <span style={liveStatusPill}>{statusLabel}</span>
        <span style={liveClockPill}>{game.clock || "0:00"}</span>
      </div>

      <div style={liveMatchupRow}>
        <LiveTeamScore name={homeTeam} score={game.home_score} />
        <div style={liveVs}>vs</div>
        <LiveTeamScore name={awayTeam} score={game.away_score} />
      </div>

      <div style={liveDetailLine}>
        {schedule.field || "Field TBD"} • {schedule.division || "Division TBD"}{schedule.week ? ` • Week ${schedule.week}` : ""}
      </div>
    </div>
  );
}

function LiveTeamScore({ name, score }) {
  const logo = getLogo(name);

  return (
    <div style={liveTeamBox}>
      <div style={liveTeamTop}>
        {logo && <img src={logo} alt="" style={liveTeamLogo} />}
        <div style={liveTeamName}>{cleanTeamName(name)}</div>
      </div>
      <div style={liveScoreNumber}>{Number(score || 0)}</div>
    </div>
  );
}

function ScoreTile({ score, game }) {
  const homeScore = Number(score.home_score || 0);
  const awayScore = Number(score.away_score || 0);
  const winner = homeScore === awayScore
    ? "Tie"
    : homeScore > awayScore
    ? cleanTeamName(score.home_team)
    : cleanTeamName(score.away_team);

  return (
    <div style={resultTile}>
      <div style={tileTop}>
        <span style={miniPill}>{game?.division || "Final"}</span>
        <span style={mutedText}>
          {formatDate(game?.event_date)}{game?.week ? ` • Week ${game.week}` : ""}
        </span>
      </div>

      <div style={scoreRow}>
        <TeamScore name={score.home_team} score={homeScore} winner={homeScore > awayScore} />
        <div style={scoreDivider}>final</div>
        <TeamScore name={score.away_team} score={awayScore} winner={awayScore > homeScore} />
      </div>

      <div style={detailLine}>
        {winner === "Tie" ? "Tie game" : `${winner} win`}{game?.field ? ` • ${game.field}` : ""}{game?.event_time || game?.time ? ` • ${game.event_time || game.time}` : ""}
      </div>
    </div>
  );
}

function TeamScore({ name, score, winner = false }) {
  const logo = getLogo(name);

  return (
    <div style={{ ...teamScore, ...(winner ? winnerTeam : {}) }}>
      <div style={teamLogoRow}>
        {logo && <img src={logo} alt="" style={teamLogo} />}
        <div style={teamName}>{cleanTeamName(name)}</div>
      </div>
      <div style={scoreNumber}>{Number(score || 0)}</div>
    </div>
  );
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function getLogo(team) {
  const key = cleanTeamName(team).toLowerCase();
  if (key.includes("49")) return TEAM_LOGOS["49ers"];
  return TEAM_LOGOS[key] || null;
}

function getLiveStatusLabel(status) {
  if (status === "halftime") return "Halftime";
  if (status === "timeout" || status === "timeout_home" || status === "timeout_away") return "Timeout";
  if (status === "final_display") return "Final";
  return "Live";
}

function formatDate(value) {
  if (!value) return "Date TBD";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, Number(month || 1) - 1, day || 1);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalizeDivision(value) {
  const division = (value || "").trim();
  if (!division) return "Unassigned";

  const compact = division.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact === "k1" || compact === "k1st" || compact === "kindergarten1st") return "K-1";
  if (compact === "23" || compact === "2nd3rd" || compact === "2nd3" || compact === "23rd") return "2nd-3rd";
  if (compact === "45" || compact === "4th5th" || compact === "4th5" || compact === "45th") return "4th-5th";
  if (compact === "68" || compact === "6th8th" || compact === "6th8" || compact === "678" || compact === "6th7th8th") return "6th-8th";

  return division;
}

function sortDivisions(a, b) {
  const order = ["K-1", "2nd-3rd", "4th-5th", "6th-8th", "Unassigned"];
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);
  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
  }
  return a.localeCompare(b);
}

const wrap = { display: "flex", flexDirection: "column", gap: 12 };
const heroCard = { marginBottom: 0 };
const panelCard = { marginBottom: 0 };
const sectionHeader = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12 };
const liveButton = { alignItems: "center", display: "flex", justifyContent: "center" };
const liveButtonActive = { background: "#dc2626" };
const liveButtonIdle = { background: "#0f7a3b" };
const searchInput = { background: "#f8fafc", border: "1px solid #d1d5db", borderRadius: 12, boxSizing: "border-box", fontSize: 16, marginTop: 12, padding: "13px 14px", width: "100%" };
const divisionGrid = { display: "grid", gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 12 };
const divisionTile = { background: "#f8fafc", border: "1px solid #d1d5db", borderRadius: 12, color: "#334155", cursor: "pointer", fontSize: 13, fontWeight: 900, minHeight: 42, padding: "10px 8px" };
const activeDivisionTile = { background: "#0f7a3b", borderColor: "#0f7a3b", color: "#fff" };
const resultTile = { background: "#fff", border: "1px solid #e5e7eb", borderLeft: "4px solid #0f7a3b", borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.05)", margin: "0 15px", padding: 16 };
const tileTop = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 };
const miniPill = { background: "#ecfdf5", borderRadius: 999, color: "#0f7a3b", fontSize: 12, fontWeight: 800, padding: "5px 9px" };
const mutedText = { color: "#64748b", fontSize: 12, fontWeight: 700, textAlign: "right" };
const scoreRow = { alignItems: "center", display: "grid", gap: 8, gridTemplateColumns: "1fr auto 1fr" };
const teamScore = { borderRadius: 12, padding: "10px 8px", textAlign: "center" };
const winnerTeam = { background: "#ecfdf5" };
const teamLogoRow = { alignItems: "center", display: "flex", flexDirection: "column", gap: 6, minHeight: 58 };
const teamLogo = { height: 34, objectFit: "contain", width: 34 };
const teamName = { color: "#111827", fontSize: 14, fontWeight: 800, lineHeight: 1.05, minHeight: 18 };
const scoreNumber = { color: "#111827", fontSize: 34, fontWeight: 900, lineHeight: 1, marginTop: 6 };
const scoreDivider = { color: "#94a3b8", fontSize: 11, fontWeight: 900, textAlign: "center", textTransform: "uppercase" };
const detailLine = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 10, textAlign: "center" };
const emptyState = { background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, color: "#64748b", fontSize: 14, fontWeight: 700, margin: "0 15px", padding: 18, textAlign: "center" };
const livePage = { display: "flex", flexDirection: "column", gap: 14, minHeight: "calc(100vh - 210px)" };
const livePageHeader = { alignItems: "center", background: "#0f172a", borderRadius: 18, color: "#fff", display: "flex", gap: 14, padding: 16 };
const backButton = { background: "#fff", border: "none", borderRadius: 12, color: "#0f172a", cursor: "pointer", flex: "0 0 auto", fontSize: 13, fontWeight: 900, padding: "10px 12px" };
const livePageTitle = { fontSize: 24, fontWeight: 900, lineHeight: 1 };
const livePageSub = { color: "#cbd5e1", fontSize: 13, fontWeight: 700, marginTop: 4 };
const liveEmpty = { alignItems: "center", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 18, color: "#64748b", display: "flex", flex: 1, fontSize: 18, fontWeight: 900, justifyContent: "center", minHeight: 220, padding: 24, textAlign: "center" };
const liveScoreCard = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, boxShadow: "0 10px 24px rgba(15,23,42,0.1)", padding: 16 };
const liveCardTop = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 };
const liveStatusPill = { background: "#fee2e2", borderRadius: 999, color: "#b91c1c", fontSize: 13, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" };
const liveClockPill = { background: "#dbeafe", borderRadius: 999, color: "#1d4ed8", fontSize: 18, fontVariantNumeric: "tabular-nums", fontWeight: 900, padding: "7px 12px" };
const liveMatchupRow = { alignItems: "stretch", display: "grid", gap: 8, gridTemplateColumns: "1fr auto 1fr" };
const liveTeamBox = { alignItems: "center", background: "#f8fafc", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 170, padding: "12px 8px", textAlign: "center" };
const liveTeamTop = { alignItems: "center", display: "flex", flexDirection: "column", gap: 8 };
const liveTeamLogo = { height: 48, objectFit: "contain", width: 48 };
const liveTeamName = { color: "#111827", fontSize: 15, fontWeight: 900, lineHeight: 1.05 };
const liveScoreNumber = { color: "#111827", fontSize: 72, fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.9, marginTop: 10 };
const liveVs = { alignSelf: "center", color: "#94a3b8", fontSize: 11, fontWeight: 900, textTransform: "uppercase" };
const liveDetailLine = { color: "#64748b", fontSize: 14, fontWeight: 800, marginTop: 14, textAlign: "center" };
