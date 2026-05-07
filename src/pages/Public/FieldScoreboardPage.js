import React, { useEffect, useMemo, useState } from "react";
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

const TEAM_LOGOS = {
  bills, bengals, broncos, lions, colts, chiefs, raiders, rams, jets, eagles,
  steelers, ravens, "49ers": niners,
};

const DEFAULT_SETTINGS = {
  live_scoreboards_open: true,
  scoreboard_game_minutes: 24,
  scoreboard_halftime_minutes: 5,
  scoreboard_timeout_seconds: 60,
  scoreboard_touchdown_points: 6,
  scoreboard_extra_one_points: 1,
  scoreboard_extra_two_points: 2,
};

export default function FieldScoreboardPage({ mode = "control" }) {
  const fieldId = getFieldIdFromPath();
  const masterPage = mode === "master";
  const scoreOnly = mode === "display" || mode === "displayHome" || mode === "displayAway";
  const displaySideMode = mode === "displayHome" ? "home" : mode === "displayAway" ? "away" : "both";
  const [field, setField] = useState(null);
  const [scoreboardFieldIds, setScoreboardFieldIds] = useState([fieldId]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [games, setGames] = useState([]);
  const [liveGame, setLiveGame] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [clockSeconds, setClockSeconds] = useState(DEFAULT_SETTINGS.scoreboard_game_minutes * 60);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadLiveGame();
      loadScoreboardSettings();
    }, 3000);
    return () => clearInterval(interval);
  }, [fieldId]);

  useEffect(() => {
    if (!running || !liveGame) return undefined;

    const interval = setInterval(() => {
      setClockSeconds((current) => {
        const next = Math.max(0, current - 1);
        updateLiveGame({ clock: formatClock(next) }, false);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, liveGame?.id]);

  const loadData = async () => {
    const { data: fieldData } = await supabase
      .from("fields")
      .select("*")
      .eq("id", fieldId)
      .maybeSingle();

    await loadScoreboardSettings();
    setField(fieldData);
    const relatedIds = await loadRelatedFieldIds(fieldData);
    setScoreboardFieldIds(relatedIds);

    const { data: gameData } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .in("field_id", relatedIds)
      .ilike("event_type", "%game%")
      .order("week", { ascending: true })
      .order("event_time", { ascending: true });

    setGames(gameData || []);

    if (!selectedWeek && gameData?.length) {
      setSelectedWeek(String(gameData[0].week || ""));
    }

    await loadLiveGame(relatedIds);
  };

  const loadRelatedFieldIds = async (fieldData) => {
    if (!fieldData) return [fieldId];

    const { data: allFields } = await supabase
      .from("fields")
      .select("*")
      .eq("is_active", true);

    const fieldKey = getPhysicalFieldKey(fieldData);
    const relatedIds = (allFields || [])
      .filter((candidate) => getPhysicalFieldKey(candidate) === fieldKey)
      .map((candidate) => candidate.id);

    return relatedIds.length ? relatedIds : [fieldId];
  };

  const loadScoreboardSettings = async () => {
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    const mergedSettings = { ...DEFAULT_SETTINGS, ...(settingsData || {}) };
    setSettings(mergedSettings);
    return mergedSettings;
  };

  const loadLiveGame = async (fieldIds = scoreboardFieldIds) => {
    const { data, error } = await supabase
      .from("games_live")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Live game load failed:", error);
      return;
    }

    const scheduleIds = [...new Set((data || []).map((row) => row.schedule_id).filter(Boolean))];
    if (!scheduleIds.length) {
      setLiveGame(null);
      return;
    }

    const { data: scheduleRows } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .in("id", scheduleIds);

    const scheduleById = {};
    (scheduleRows || []).forEach((game) => {
      scheduleById[game.id] = game;
    });

    const hydratedRows = (data || []).map((row) => ({
      ...row,
      schedule_master_auto: scheduleById[row.schedule_id],
    }));

    const active = hydratedRows.find((row) => fieldIds.includes(row.schedule_master_auto?.field_id));
    if (!active) {
      setLiveGame(null);
      return;
    }

    setLiveGame(active);
    setClockSeconds(clockToSeconds(active.clock || formatClock(settings.scoreboard_game_minutes * 60)));
  };

  const weeks = useMemo(() => (
    [...new Set(games.map((game) => game.week).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b))
      .map(String)
  ), [games]);

  const weekLabels = useMemo(() => getWeekLabels(games), [games]);
  const weekGames = games.filter((game) => String(game.week || "") === String(selectedWeek));
  const displayWeekGames = useMemo(() => getDisplayWeekGames(games), [games]);
  const scoreboardsOpen = settings.live_scoreboards_open !== false;

  const startGame = async (game) => {
    if (!scoreboardsOpen) {
      setStatus({ type: "error", message: "Live scoreboards are turned off by the admin." });
      return;
    }

    setStatus(null);
    await supabase.from("games_live").update({ status: "closed" }).eq("schedule_id", game.id).eq("status", "live");

    const row = {
      schedule_id: game.id,
      home_score: 0,
      away_score: 0,
      clock: formatClock(Number(settings.scoreboard_game_minutes || 24) * 60),
      status: "live",
      quarter: 1,
      half: 1,
    };

    const { data, error } = await supabase
      .from("games_live")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      console.error("Start live game failed:", error);
      setStatus({ type: "error", message: "Could not start this game." });
      return;
    }

    setLiveGame({ ...data, schedule_master_auto: game });
    setClockSeconds(clockToSeconds(row.clock));
    setRunning(false);
  };

  const startTestGame = async () => {
    if (!scoreboardsOpen) {
      setStatus({ type: "error", message: "Live scoreboards are turned off by the admin." });
      return;
    }

    setStatus(null);
    const testSchedule = {
      field_id: fieldId,
      field: field?.name || "Test Field",
      event_type: "scoreboard test",
      source: "scoreboard-test",
      team: "Home",
      opponent: "Away",
      event_date: getLocalDateString(new Date()),
      event_time: "Test",
      time: "Test",
      division: "Test",
    };

    const { data: testGame, error: testError } = await supabase
      .from("schedule_master_auto")
      .insert(testSchedule)
      .select("*")
      .single();

    if (testError) {
      console.error("Test game create failed:", testError);
      setStatus({ type: "error", message: "Could not create a test game." });
      return;
    }

    await startGame({ ...testGame, is_scoreboard_test: true });
  };

  const updateLiveGame = async (updates, refresh = true) => {
    if (!liveGame) return;

    const { error } = await supabase
      .from("games_live")
      .update(updates)
      .eq("id", liveGame.id);

    if (error) {
      console.error("Live game update failed:", error);
      return;
    }

    if (refresh) setLiveGame((current) => ({ ...current, ...updates }));
  };

  const addPoints = (side, points) => {
    const fieldName = side === "home" ? "home_score" : "away_score";
    updateLiveGame({ [fieldName]: Number(liveGame[fieldName] || 0) + Number(points || 0) });
  };

  const endGame = async () => {
    if (!liveGame) return;
    setRunning(false);

    const game = liveGame.schedule_master_auto;
    if (isTestGame(game)) {
      await exitLiveGame("Test game closed. No season score was saved.");
      return;
    }

    const existing = await supabase
      .from("game_scores")
      .select("id")
      .eq("schedule_id", liveGame.schedule_id)
      .maybeSingle();

    const finalScore = {
      schedule_id: liveGame.schedule_id,
      home_team: cleanTeamName(game?.team),
      away_team: cleanTeamName(game?.opponent),
      home_score: Number(liveGame.home_score || 0),
      away_score: Number(liveGame.away_score || 0),
    };

    const { error } = existing.data?.id
      ? await supabase.from("game_scores").update(finalScore).eq("id", existing.data.id)
      : await supabase.from("game_scores").insert(finalScore);

    if (error) {
      console.error("Final score save failed:", error);
      setStatus({ type: "error", message: "Could not save final score." });
      return;
    }

    await supabase.from("games_live").update({ status: "final" }).eq("id", liveGame.id);
    setStatus({ type: "success", message: "Final score saved." });
    setLiveGame(null);
  };

  const exitLiveGame = async (message = "Live game stopped. No score was saved.") => {
    if (!liveGame) return;

    setRunning(false);
    await supabase.from("games_live").update({ status: "closed" }).eq("id", liveGame.id);

    if (isTestGame(liveGame.schedule_master_auto)) {
      await supabase.from("schedule_master_auto").delete().eq("id", liveGame.schedule_id);
    }

    setLiveGame(null);
    setStatus({ type: "success", message });
    await loadData();
  };

  if (scoreOnly) {
    return (
      <ScoreOnlyBoard
        field={field}
        liveGame={scoreboardsOpen ? liveGame : null}
        games={displayWeekGames}
        scoreboardsOpen={scoreboardsOpen}
        sideMode={displaySideMode}
      />
    );
  }

  if (masterPage) {
    return (
      <div style={controlWrap}>
        <div style={masterHero}>
          <div style={pageTitle}>{field?.name || "Field Scoreboard"}</div>
          <div style={pageSub}>
            {scoreboardsOpen
              ? "Choose which iPad view to open for this field."
              : "Live scoreboards are currently turned off by the admin."}
          </div>
        </div>

        {scoreboardsOpen ? (
          <div style={masterGrid}>
            <a href={`/field-scoreboard/${fieldId}/control`} style={masterTile}>
              <div style={masterTileTitle}>Scorekeeper iPad</div>
              <div style={masterTileSub}>Start the field game, run the clock, add points, and save final scores.</div>
            </a>

            <a href={`/field-scoreboard/${fieldId}/display`} style={masterTile}>
              <div style={masterTileTitle}>Full Display iPad</div>
              <div style={masterTileSub}>Two-team score view on one screen.</div>
            </a>

            <a href={`/field-scoreboard/${fieldId}/display/home`} style={masterTile}>
              <div style={masterTileTitle}>Home Display iPad</div>
              <div style={masterTileSub}>Home side score view for one side of the field.</div>
            </a>

            <a href={`/field-scoreboard/${fieldId}/display/away`} style={masterTile}>
              <div style={masterTileTitle}>Away Display iPad</div>
              <div style={masterTileSub}>Away side score view for the other side of the field.</div>
            </a>
          </div>
        ) : (
          <div style={closedPanel}>Turn on live scoreboards in the admin portal to activate this field link.</div>
        )}
      </div>
    );
  }

  return (
    <div style={controlWrap}>
      <div style={topBar}>
        <div>
          <div style={pageTitle}>{field?.name || "Field Scoreboard"}</div>
          <div style={pageSub}>Controller link for this field</div>
        </div>
        <div style={displayLinks}>
          <a style={displayLink} href={`/field-scoreboard/${fieldId}/display/home`} target="_blank" rel="noreferrer">
            Home Display
          </a>
          <a style={displayLink} href={`/field-scoreboard/${fieldId}/display/away`} target="_blank" rel="noreferrer">
            Away Display
          </a>
        </div>
      </div>

      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      {!scoreboardsOpen && (
        <div style={closedPanel}>Live scoreboards are turned off. Turn them on in the admin portal before starting a game.</div>
      )}

      {!liveGame && scoreboardsOpen && (
        <div style={setupPanel}>
          <h2 style={panelTitle}>Select Game</h2>
          <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} style={select}>
            {weeks.map((week) => <option key={week} value={week}>{weekLabels[week] || `Week ${week}`}</option>)}
          </select>

          <div style={gameGrid}>
            <button style={{ ...gameTile, ...testGameTile }} onClick={startTestGame}>
              <div style={gameTeams}>Scoreboard Test Game</div>
              <div style={gameMeta}>Home vs Away • does not save to season scores</div>
              <div style={startText}>Start Test</div>
            </button>

            {weekGames.map((game) => (
              <button key={game.id} style={gameTile} onClick={() => startGame(game)}>
                <div style={gameTeams}>{cleanTeamName(game.team)} vs {cleanTeamName(game.opponent)}</div>
                <div style={gameMeta}>{game.event_time || game.time} • {game.division}</div>
                <div style={startText}>Start Game</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {liveGame && (
        <div style={boardPanel}>
          <div style={timer}>{formatClock(clockSeconds)}</div>
          <div style={timerActions}>
            <button style={primaryBtn} onClick={() => setRunning((current) => !current)}>
              {running ? "Pause" : "Start Game"}
            </button>
            <button
              style={secondaryBtn}
              onClick={() => {
                const seconds = Number(settings.scoreboard_game_minutes || 24) * 60;
                setClockSeconds(seconds);
                updateLiveGame({ clock: formatClock(seconds) });
              }}
            >
              Reset Clock
            </button>
            <button
              style={secondaryBtn}
              onClick={() => {
                const seconds = Number(settings.scoreboard_timeout_seconds || 60);
                setClockSeconds(seconds);
                updateLiveGame({ clock: formatClock(seconds) });
              }}
            >
              Timeout
            </button>
            <button style={dangerGhostBtn} onClick={() => exitLiveGame()}>
              Exit Without Saving
            </button>
          </div>

          <div style={scoreGrid}>
            <TeamControls
              team={liveGame.schedule_master_auto?.team}
              score={liveGame.home_score}
              onAdd={(points) => addPoints("home", points)}
              settings={settings}
            />
            <TeamControls
              team={liveGame.schedule_master_auto?.opponent}
              score={liveGame.away_score}
              onAdd={(points) => addPoints("away", points)}
              settings={settings}
            />
          </div>

          <button style={endBtn} onClick={endGame}>
            {isTestGame(liveGame.schedule_master_auto) ? "End Test Game" : "End Game and Save Final"}
          </button>
        </div>
      )}
    </div>
  );
}

function TeamControls({ team, score, onAdd, settings }) {
  const logo = getLogo(team);

  return (
    <div style={teamPanel}>
      {logo && <img src={logo} alt="" style={logoStyle} />}
      <div style={teamName}>{cleanTeamName(team)}</div>
      <div style={scoreText}>{score || 0}</div>
      <div style={pointGrid}>
        <button style={pointBtn} onClick={() => onAdd(settings.scoreboard_touchdown_points)}>Touchdown</button>
        <button style={pointBtn} onClick={() => onAdd(settings.scoreboard_extra_one_points)}>+1 XP</button>
        <button style={pointBtn} onClick={() => onAdd(settings.scoreboard_extra_two_points)}>+2 XP</button>
      </div>
    </div>
  );
}

function ScoreOnlyBoard({ field, liveGame, games = [], scoreboardsOpen = true, sideMode = "both" }) {
  const game = liveGame?.schedule_master_auto;
  const weekLabel = games[0]?.week ? `Week ${games[0].week}` : "Scheduled Games";
  const singleSide = sideMode === "home" || sideMode === "away";
  const singleTeam = sideMode === "home" ? game?.team : game?.opponent;
  const singleScore = sideMode === "home" ? liveGame?.home_score : liveGame?.away_score;

  return (
    <div style={singleSide ? displaySingleWrap : displayWrap}>
      {!scoreboardsOpen && (
        <div style={displayEmpty}>
          <div style={displayIdleTitle}>{field?.name || "Field"}</div>
          <div style={displayIdleSub}>Live scoreboards are turned off</div>
        </div>
      )}

      {scoreboardsOpen && !liveGame && (
        <div style={displaySchedule}>
          <div style={displayFieldName}>{field?.name || "Field"}</div>
          <div style={displayWeekLabel}>{weekLabel}</div>
          <div style={displayGameList}>
            {games.length ? games.map((scheduledGame) => (
              <div key={scheduledGame.id} style={displayGameRow}>
                <div style={displayGameTime}>{scheduledGame.event_time || scheduledGame.time || "Time TBD"}</div>
                <div style={displayGameTeams}>
                  {cleanTeamName(scheduledGame.team)} vs {cleanTeamName(scheduledGame.opponent)}
                </div>
                <div style={displayGameDivision}>{scheduledGame.division}</div>
              </div>
            )) : (
              <div style={displayNoGames}>No scheduled games found for this field.</div>
            )}
          </div>
        </div>
      )}

      {scoreboardsOpen && liveGame && singleSide && (
        <ScoreOnlySide team={singleTeam} score={singleScore} single />
      )}

      {scoreboardsOpen && liveGame && !singleSide && (
        <>
          <ScoreOnlySide team={game?.team} score={liveGame.home_score} />
          <ScoreOnlySide team={game?.opponent} score={liveGame.away_score} />
        </>
      )}
    </div>
  );
}

function ScoreOnlySide({ team, score, single = false }) {
  const logo = getLogo(team);
  return (
    <div style={single ? displaySingleSide : displaySide}>
      {logo && <img src={logo} alt="" style={single ? displaySingleLogo : displayLogo} />}
      <div style={single ? displaySingleTeam : displayTeam}>{cleanTeamName(team)}</div>
      <div style={single ? displaySingleScore : displayScore}>{score || 0}</div>
    </div>
  );
}

function getFieldIdFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[1] || "";
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function getLogo(team) {
  const key = cleanTeamName(team).toLowerCase();
  if (key.includes("49")) return TEAM_LOGOS["49ers"];
  return TEAM_LOGOS[key] || null;
}

function isTestGame(game) {
  return game?.source === "scoreboard-test" || game?.is_scoreboard_test;
}

function getPhysicalFieldKey(field) {
  return [
    cleanKey(field?.name),
    field?.field_number || "",
    cleanKey(field?.type),
  ].join("|");
}

function cleanKey(value) {
  return (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function formatClock(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function clockToSeconds(value) {
  const [minutes, seconds] = (value || "0:00").split(":").map(Number);
  return (Number(minutes || 0) * 60) + Number(seconds || 0);
}

function getDisplayWeekGames(games) {
  if (!games.length) return [];

  const sortedGames = [...games].sort(sortGames);
  const today = getLocalDateString(new Date());
  const todaysGames = sortedGames.filter((game) => game.event_date === today);
  if (todaysGames.length) return todaysGames;

  const upcomingGame = sortedGames.find((game) => game.event_date && game.event_date >= today);
  if (upcomingGame?.week) {
    return sortedGames.filter((game) => String(game.week) === String(upcomingGame.week));
  }

  const firstWeek = sortedGames.find((game) => game.week)?.week;
  return firstWeek
    ? sortedGames.filter((game) => String(game.week) === String(firstWeek))
    : sortedGames;
}

function getWeekLabels(games) {
  return games.reduce((labels, game) => {
    const week = String(game.week || "");
    if (!week || labels[week]) return labels;

    const weekGames = games
      .filter((candidate) => String(candidate.week || "") === week && candidate.event_date)
      .sort(sortGames);

    if (!weekGames.length) {
      labels[week] = `Week ${week}`;
      return labels;
    }

    const dates = [...new Set(weekGames.map((candidate) => candidate.event_date))];
    labels[week] = dates.length === 1
      ? `Week ${week} - ${formatShortDate(dates[0])}`
      : `Week ${week} - ${formatShortDate(dates[0])} to ${formatShortDate(dates[dates.length - 1])}`;

    return labels;
  }, {});
}

function formatShortDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, Number(month || 1) - 1, day || 1);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sortGames(a, b) {
  const dateCompare = String(a.event_date || "").localeCompare(String(b.event_date || ""));
  if (dateCompare) return dateCompare;
  return timeToMinutes(a.event_time || a.time) - timeToMinutes(b.event_time || b.time);
}

function timeToMinutes(value) {
  const clean = (value || "").toString().trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return (hours * 60) + minutes;
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const controlWrap = { background: "#f8fafc", boxSizing: "border-box", minHeight: "100vh", padding: 24 };
const masterHero = { background: "#fff", borderRadius: 20, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 30, textAlign: "center" };
const masterGrid = { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 20 };
const masterTile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", color: "#0f172a", minHeight: 136, padding: 28, textDecoration: "none" };
const masterTileTitle = { fontSize: 28, fontWeight: 900, lineHeight: 1.05 };
const masterTileSub = { color: "#64748b", fontSize: 17, fontWeight: 800, lineHeight: 1.35, marginTop: 10 };
const closedPanel = { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 18, color: "#9a3412", fontSize: 19, fontWeight: 900, marginTop: 16, padding: 24, textAlign: "center" };
const topBar = { alignItems: "center", background: "#fff", borderRadius: 18, display: "flex", justifyContent: "space-between", padding: 22, gap: 16 };
const pageTitle = { color: "#0f172a", fontSize: 34, fontWeight: 900, lineHeight: 1.05 };
const pageSub = { color: "#64748b", fontSize: 16, fontWeight: 800, marginTop: 4 };
const displayLinks = { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" };
const displayLink = { background: "#111827", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 900, minHeight: 48, padding: "14px 16px", textDecoration: "none" };
const statusBox = { borderRadius: 12, fontSize: 16, fontWeight: 900, marginTop: 14, padding: 14 };
const successBox = { background: "#dcfce7", color: "#166534" };
const errorBox = { background: "#fee2e2", color: "#991b1b" };
const setupPanel = { background: "#fff", borderRadius: 18, marginTop: 18, padding: 22 };
const panelTitle = { color: "#0f172a", fontSize: 28, fontWeight: 900, marginTop: 0 };
const select = { appearance: "none", background: "#f8fafc", border: "2px solid #cbd5e1", borderRadius: 14, color: "#0f172a", fontSize: 22, fontWeight: 900, minHeight: 62, padding: "16px 18px", width: "100%" };
const gameGrid = { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", marginTop: 18 };
const gameTile = { background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: 16, cursor: "pointer", minHeight: 132, padding: 20, textAlign: "left" };
const testGameTile = { background: "#f0fdf4", borderColor: "#86efac" };
const gameTeams = { color: "#0f172a", fontSize: 23, fontWeight: 900, lineHeight: 1.1 };
const gameMeta = { color: "#64748b", fontSize: 16, fontWeight: 800, marginTop: 8 };
const startText = { color: "#16a34a", fontSize: 16, fontWeight: 900, marginTop: 14, textTransform: "uppercase" };
const boardPanel = { background: "#fff", borderRadius: 20, marginTop: 18, padding: 22 };
const timer = { color: "#0f172a", fontSize: 104, fontWeight: 900, lineHeight: 0.95, textAlign: "center" };
const timerActions = { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 14 };
const primaryBtn = { background: "#16a34a", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 900, minHeight: 58, padding: "16px 22px" };
const secondaryBtn = { background: "#e5e7eb", border: "none", borderRadius: 14, color: "#111827", cursor: "pointer", fontSize: 18, fontWeight: 900, minHeight: 58, padding: "16px 22px" };
const dangerGhostBtn = { background: "#fee2e2", border: "none", borderRadius: 14, color: "#991b1b", cursor: "pointer", fontSize: 18, fontWeight: 900, minHeight: 58, padding: "16px 22px" };
const scoreGrid = { display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginTop: 22 };
const teamPanel = { background: "#f8fafc", borderRadius: 20, padding: 22, textAlign: "center" };
const logoStyle = { height: 90, objectFit: "contain", width: 90 };
const teamName = { color: "#0f172a", fontSize: 30, fontWeight: 900, lineHeight: 1.05, marginTop: 10 };
const scoreText = { color: "#0f172a", fontSize: 118, fontWeight: 900, lineHeight: 0.9 };
const pointGrid = { display: "grid", gap: 12 };
const pointBtn = { background: "#2f6ea6", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 19, fontWeight: 900, minHeight: 60, padding: "17px 12px" };
const endBtn = { background: "#dc2626", border: "none", borderRadius: 16, color: "#fff", cursor: "pointer", fontSize: 20, fontWeight: 900, marginTop: 18, minHeight: 64, padding: 18, width: "100%" };
const displayWrap = { background: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr", height: "100vh", minHeight: "100vh", overflow: "hidden", width: "100vw" };
const displaySingleWrap = { background: "#fff", display: "grid", height: "100vh", minHeight: "100vh", overflow: "hidden", width: "100vw" };
const displaySide = { alignItems: "center", borderRight: "0.7vw solid #111827", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100vh", overflow: "hidden", padding: "1.5vh 1.5vw 1vh" };
const displaySingleSide = { alignItems: "center", boxSizing: "border-box", display: "flex", flexDirection: "column", height: "100vh", justifyContent: "center", overflow: "hidden", padding: "2vh 2vw" };
const displayLogo = { height: "min(15vh, 16vw)", objectFit: "contain", width: "min(15vh, 16vw)" };
const displaySingleLogo = { height: "min(18vh, 18vw)", objectFit: "contain", width: "min(18vh, 18vw)" };
const displayTeam = { color: "#111827", fontSize: "clamp(38px, 5.8vw, 96px)", fontWeight: 900, lineHeight: 0.95, marginTop: "1vh", maxWidth: "46vw", overflowWrap: "anywhere", textAlign: "center" };
const displaySingleTeam = { color: "#111827", fontSize: "clamp(58px, 9vw, 150px)", fontWeight: 900, lineHeight: 0.9, marginTop: "2vh", maxWidth: "96vw", overflowWrap: "anywhere", textAlign: "center" };
const displayScore = { color: "#111827", fontSize: "clamp(210px, 39vw, 700px)", fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: 0, lineHeight: 0.78, marginTop: "2vh", maxWidth: "47vw", textAlign: "center" };
const displaySingleScore = { color: "#111827", fontSize: "clamp(360px, 72vw, 980px)", fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: 0, lineHeight: 0.72, marginTop: "2vh", maxWidth: "96vw", textAlign: "center" };
const displayEmpty = { alignItems: "center", color: "#111827", display: "flex", flexDirection: "column", fontSize: "clamp(44px, 7vw, 112px)", fontWeight: 900, gridColumn: "1 / -1", height: "100vh", justifyContent: "center", padding: "4vh 4vw", textAlign: "center" };
const displayIdleTitle = { fontSize: "clamp(72px, 12vw, 180px)", fontWeight: 900, lineHeight: 0.95 };
const displayIdleSub = { color: "#64748b", fontSize: "clamp(34px, 5vw, 78px)", marginTop: "3vh" };
const displaySchedule = { alignItems: "center", boxSizing: "border-box", display: "flex", flexDirection: "column", gridColumn: "1 / -1", height: "100vh", justifyContent: "center", overflow: "hidden", padding: "3vh 3vw" };
const displayFieldName = { color: "#111827", fontSize: "clamp(76px, 11vw, 170px)", fontWeight: 900, lineHeight: 0.9, textAlign: "center" };
const displayWeekLabel = { color: "#2f6ea6", fontSize: "clamp(34px, 5vw, 78px)", fontWeight: 900, marginTop: "2vh", textTransform: "uppercase" };
const displayGameList = { display: "grid", gap: "1.8vh", marginTop: "3vh", maxWidth: "94vw", width: "100%" };
const displayGameRow = { alignItems: "center", border: "0.45vw solid #111827", borderRadius: "1.5vw", boxSizing: "border-box", display: "grid", gap: "2vw", gridTemplateColumns: "18vw 1fr 22vw", minHeight: "12vh", padding: "1.8vh 2vw" };
const displayGameTime = { color: "#111827", fontSize: "clamp(34px, 4.8vw, 76px)", fontWeight: 900, lineHeight: 0.95 };
const displayGameTeams = { color: "#111827", fontSize: "clamp(36px, 5.2vw, 86px)", fontWeight: 900, lineHeight: 0.95, overflowWrap: "anywhere" };
const displayGameDivision = { color: "#475569", fontSize: "clamp(24px, 3.6vw, 58px)", fontWeight: 900, lineHeight: 1, textAlign: "right" };
const displayNoGames = { color: "#64748b", fontSize: "clamp(44px, 7vw, 108px)", fontWeight: 900, textAlign: "center" };
