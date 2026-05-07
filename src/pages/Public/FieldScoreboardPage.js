import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];
const FINAL_DISPLAY_SECONDS = 120;

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
  const [displayClockRunning, setDisplayClockRunning] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [deviceFlow, setDeviceFlow] = useState(null);
  const lastServerClockRef = useRef(null);
  const displaySyncKeyRef = useRef("");
  const displayClockAnchorRef = useRef({ seconds: DEFAULT_SETTINGS.scoreboard_game_minutes * 60, syncedAt: Date.now() });
  const gameClockBeforeBreakRef = useRef(DEFAULT_SETTINGS.scoreboard_game_minutes * 60);

  useEffect(() => {
    loadData();
    const refreshMs = scoreOnly ? 1500 : 3000;
    const interval = setInterval(() => {
      loadLiveGame();
      loadScoreboardSettings();
    }, refreshMs);
    return () => clearInterval(interval);
  }, [fieldId, scoreOnly]);

  useEffect(() => {
    if (!running || !liveGame) return undefined;

    const interval = setInterval(() => {
      setClockSeconds((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0 && isBreakStatus(liveGame.status)) {
          finishBreakClock();
          return 0;
        }
        if (next === 0 && liveGame.status === "final_display") {
          finishFinalDisplay();
          return 0;
        }
        updateLiveGame({ clock: formatClock(next) }, false);
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, liveGame?.id, liveGame?.status]);

  useEffect(() => {
    if (!scoreOnly || !liveGame || !displayClockRunning) return undefined;

    const interval = setInterval(() => {
      const { seconds, syncedAt } = displayClockAnchorRef.current;
      const elapsed = Math.floor((Date.now() - syncedAt) / 1000);
      setClockSeconds(Math.max(0, seconds - elapsed));
    }, 250);

    return () => clearInterval(interval);
  }, [scoreOnly, liveGame?.id, displayClockRunning]);

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
      .in("status", LIVE_GAME_STATUSES)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Live game load failed:", error);
      return;
    }

    const scheduleIds = [...new Set((data || []).map((row) => row.schedule_id).filter(Boolean))];
    if (!scheduleIds.length) {
      lastServerClockRef.current = null;
      displaySyncKeyRef.current = "";
      displayClockAnchorRef.current = { seconds: 0, syncedAt: Date.now() };
      setDisplayClockRunning(false);
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
      lastServerClockRef.current = null;
      displaySyncKeyRef.current = "";
      displayClockAnchorRef.current = { seconds: 0, syncedAt: Date.now() };
      setDisplayClockRunning(false);
      setLiveGame(null);
      return;
    }

    const serverClockSeconds = clockToSeconds(active.clock || formatClock(settings.scoreboard_game_minutes * 60));
    if (scoreOnly) {
      const previousServerClock = lastServerClockRef.current;
      const serverClockMoving = previousServerClock !== null && serverClockSeconds < previousServerClock;
      const breakClockRunning = isBreakStatus(active.status) && serverClockSeconds > 0;
      setDisplayClockRunning(serverClockMoving || breakClockRunning);
      const syncKey = `${active.id}-${active.status}`;
      const { seconds, syncedAt } = displayClockAnchorRef.current;
      const localEstimate = Math.max(0, seconds - Math.floor((Date.now() - syncedAt) / 1000));
      const shouldHardSync = displaySyncKeyRef.current !== syncKey || Math.abs(localEstimate - serverClockSeconds) > 2 || (!serverClockMoving && !breakClockRunning);
      if (shouldHardSync) {
        displayClockAnchorRef.current = { seconds: serverClockSeconds, syncedAt: Date.now() };
        displaySyncKeyRef.current = syncKey;
        setClockSeconds(serverClockSeconds);
      }
      lastServerClockRef.current = serverClockSeconds;
    } else {
      setClockSeconds(serverClockSeconds);
    }

    setLiveGame(active);
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
    const existingScore = await supabase
      .from("game_scores")
      .select("id")
      .eq("schedule_id", game.id)
      .maybeSingle();

    if (existingScore.data?.id) {
      setStatus({ type: "error", message: "This game already has a saved final score." });
      return;
    }

    await supabase
      .from("games_live")
      .update({ status: "closed" })
      .in("status", LIVE_GAME_STATUSES)
      .neq("schedule_id", game.id);

    const row = {
      schedule_id: game.id,
      home_score: 0,
      away_score: 0,
      clock: formatClock(Number(settings.scoreboard_game_minutes || 24) * 60),
      status: "live",
      quarter: 1,
      half: 1,
    };

    const existingLive = await supabase
      .from("games_live")
      .select("*")
      .eq("schedule_id", game.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLive.data?.id) {
      const { data, error } = await supabase
        .from("games_live")
        .update(row)
        .eq("id", existingLive.data.id)
        .select("*")
        .single();

      if (error) {
        console.error("Restart live game failed:", error);
        setStatus({ type: "error", message: "Could not start this game." });
        return;
      }

      setLiveGame({ ...data, schedule_master_auto: game });
      setClockSeconds(clockToSeconds(row.clock));
      setRunning(false);
      return;
    }

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

  const startBreakClock = async (type, side = null) => {
    if (!liveGame) return;
    if (isBreakStatus(liveGame.status) || liveGame.status === "final_display") return;

    const gameClock = clockSeconds;
    const statusValue = type === "timeout" && side ? `timeout_${side}` : type;
    const seconds = type === "halftime"
      ? Number(settings.scoreboard_halftime_minutes || 5) * 60
      : Number(settings.scoreboard_timeout_seconds || 60);

    if (type === "timeout") {
      gameClockBeforeBreakRef.current = gameClock;
    }

    setRunning(false);
    setClockSeconds(seconds);
    await updateLiveGame({ status: statusValue, clock: formatClock(seconds), quarter: type === "timeout" ? gameClock : liveGame.quarter });
    setRunning(true);
  };

  const finishBreakClock = async () => {
    if (!liveGame) return;
    const nextClock = isTimeoutStatus(liveGame.status)
      ? Number(liveGame.quarter || gameClockBeforeBreakRef.current || Number(settings.scoreboard_game_minutes || 24) * 60)
      : Number(settings.scoreboard_game_minutes || 24) * 60;

    setRunning(false);
    setClockSeconds(nextClock);
    await updateLiveGame({
      status: "live",
      clock: formatClock(nextClock),
      half: liveGame.status === "halftime" ? 2 : liveGame.half,
      quarter: liveGame.status === "halftime" ? 2 : 1,
    });
  };

  const finishFinalDisplay = async () => {
    if (!liveGame) return;

    setRunning(false);
    await supabase.from("games_live").update({ status: "final" }).eq("id", liveGame.id);
    setLiveGame(null);
    await loadData();
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

  const removePoints = (side, points) => {
    const fieldName = side === "home" ? "home_score" : "away_score";
    updateLiveGame({ [fieldName]: Math.max(0, Number(liveGame[fieldName] || 0) - Number(points || 0)) });
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

    const finalClock = formatClock(FINAL_DISPLAY_SECONDS);
    await supabase.from("games_live").update({ status: "final_display", clock: finalClock }).eq("id", liveGame.id);
    setClockSeconds(FINAL_DISPLAY_SECONDS);
    setRunning(true);
    setLiveGame((current) => current ? { ...current, status: "final_display", clock: finalClock } : current);
    setStatus({ type: "success", message: "Final score saved. Showing final score for 2 minutes." });
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
        liveClock={formatClock(clockSeconds)}
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
          <div style={closedPanel}>Live scoreboard has not been activated.</div>
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
          {liveGame && liveGame.status !== "final_display" && (
            <button style={topExitBtn} onClick={() => exitLiveGame()}>
              Exit Without Saving
            </button>
          )}
          {liveGame && liveGame.status !== "final_display" && (
            <button style={topEndBtn} onClick={endGame}>
              {isTestGame(liveGame.schedule_master_auto) ? "End Test" : "End Game"}
            </button>
          )}
          <button style={displayLink} onClick={() => setDeviceFlow({ type: null })}>
            Add Displays
          </button>
        </div>
      </div>

      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      {!scoreboardsOpen && (
        <div style={closedPanel}>Live scoreboard has not been activated.</div>
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
          {liveGame.status === "final_display" ? (
            <div style={controllerFinalPanel}>
              <div style={controllerFinalLabel}>Final score saved</div>
              <div style={controllerFinalScore}>
                {liveGame.home_score || 0} - {liveGame.away_score || 0}
              </div>
              <div style={controllerFinalSub}>
                Displays will return to the field schedule in {formatClock(clockSeconds)}.
              </div>
            </div>
          ) : (
            <>
              {isBreakStatus(liveGame.status) && (
                <div style={controllerBreakBanner}>
                  {getBreakLabel(liveGame, "controller")} countdown running. Game clock is paused.
                </div>
              )}
              <div style={timer}>{formatClock(clockSeconds)}</div>
              <div style={timerActions}>
                <button
                  style={primaryBtn}
                  disabled={isBreakStatus(liveGame.status)}
                  onClick={() => setRunning((current) => !current)}
                >
                  {running ? "Pause" : getGameClockButtonLabel(liveGame, clockSeconds, settings)}
                </button>
                <button
                  style={secondaryBtn}
                  disabled={isBreakStatus(liveGame.status)}
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
                  disabled={isBreakStatus(liveGame.status)}
                  onClick={() => startBreakClock("halftime")}
                >
                  Halftime
                </button>
              </div>

              <div style={scoreGrid}>
                <TeamControls
                  team={liveGame.schedule_master_auto?.team}
                  score={liveGame.home_score}
                  onAdd={(points) => addPoints("home", points)}
                  onRemove={(points) => removePoints("home", points)}
                  onTimeout={() => startBreakClock("timeout", "home")}
                  settings={settings}
                  disabled={isBreakStatus(liveGame.status)}
                />
                <TeamControls
                  team={liveGame.schedule_master_auto?.opponent}
                  score={liveGame.away_score}
                  onAdd={(points) => addPoints("away", points)}
                  onRemove={(points) => removePoints("away", points)}
                  onTimeout={() => startBreakClock("timeout", "away")}
                  settings={settings}
                  disabled={isBreakStatus(liveGame.status)}
                />
              </div>
            </>
          )}
        </div>
      )}
      {deviceFlow && (
        <DeviceOverlay
          field={field}
          fieldId={fieldId}
          type={deviceFlow.type}
          onSelect={(type) => setDeviceFlow({ type })}
          onBack={() => setDeviceFlow({ type: null })}
          onClose={() => setDeviceFlow(null)}
        />
      )}
    </div>
  );
}

function TeamControls({ team, score, onAdd, onRemove, onTimeout, settings, disabled = false }) {
  const logo = getLogo(team);

  return (
    <div style={teamPanel}>
      <div style={teamHeader}>
        {logo && <img src={logo} alt="" style={logoStyle} />}
        <div style={teamName}>{cleanTeamName(team)}</div>
      </div>
      <div style={scoreText}>{score || 0}</div>
      <div style={pointGrid}>
        <button style={pointBtn} disabled={disabled} onClick={() => onAdd(settings.scoreboard_touchdown_points)}>+ Touchdown</button>
        <button style={pointBtn} disabled={disabled} onClick={() => onAdd(settings.scoreboard_extra_one_points)}>+1 XP</button>
        <button style={pointBtn} disabled={disabled} onClick={() => onAdd(settings.scoreboard_extra_two_points)}>+2 XP</button>
      </div>
      <div style={undoGrid}>
        <button style={undoBtn} disabled={disabled} onClick={() => onRemove(settings.scoreboard_touchdown_points)}>- TD</button>
        <button style={undoBtn} disabled={disabled} onClick={() => onRemove(settings.scoreboard_extra_one_points)}>-1</button>
        <button style={undoBtn} disabled={disabled} onClick={() => onRemove(settings.scoreboard_extra_two_points)}>-2</button>
      </div>
      <button style={timeoutTeamBtn} disabled={disabled} onClick={onTimeout}>
        Timeout
      </button>
    </div>
  );
}

function ScoreOnlyBoard({ field, liveGame, liveClock, games = [], scoreboardsOpen = true, sideMode = "both" }) {
  const game = liveGame?.schedule_master_auto;
  const weekLabel = games[0]?.week ? `Week ${games[0].week}` : "Scheduled Games";
  const singleSide = sideMode === "home" || sideMode === "away";
  const singleTeam = sideMode === "home" ? game?.team : game?.opponent;
  const singleScore = sideMode === "home" ? liveGame?.home_score : liveGame?.away_score;
  const breakMode = isBreakStatus(liveGame?.status);
  const finalMode = liveGame?.status === "final_display";

  return (
    <div style={singleSide ? displaySingleWrap : displayWrap}>
      {!scoreboardsOpen && (
        <div style={displayEmpty}>
          <div style={displayIdleTitle}>{field?.name || "Field"}</div>
          <div style={displayIdleSub}>Live scoreboard has not been activated</div>
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

      {scoreboardsOpen && liveGame && breakMode && (
        <BreakClockDisplay label={getBreakLabel(liveGame)} clock={liveClock || liveGame.clock} />
      )}

      {scoreboardsOpen && liveGame && finalMode && (
        <FinalScoreDisplay game={game} liveGame={liveGame} clock={liveClock || liveGame.clock} />
      )}

      {scoreboardsOpen && liveGame && singleSide && (
        !breakMode && !finalMode && <ScoreOnlySide team={singleTeam} score={singleScore} clock={liveClock || liveGame.clock} single />
      )}

      {scoreboardsOpen && liveGame && !singleSide && (
        !breakMode && !finalMode && <>
          <ScoreOnlySide team={game?.team} score={liveGame.home_score} clock={liveClock || liveGame.clock} />
          <ScoreOnlySide team={game?.opponent} score={liveGame.away_score} clock={liveClock || liveGame.clock} />
        </>
      )}
    </div>
  );
}

function BreakClockDisplay({ label, clock }) {
  return (
    <div style={breakDisplay}>
      <div style={breakLabel}>{label}</div>
      <div style={breakClock}>{clock || "0:00"}</div>
      <div style={breakSub}>Game clock paused</div>
    </div>
  );
}

function FinalScoreDisplay({ game, liveGame, clock }) {
  const homeScore = Number(liveGame?.home_score || 0);
  const awayScore = Number(liveGame?.away_score || 0);
  const winner = homeScore === awayScore
    ? "Tie Game"
    : `${cleanTeamName(homeScore > awayScore ? game?.team : game?.opponent)} Wins`;

  return (
    <div style={finalDisplay}>
      <div style={finalLabel}>Final</div>
      <div style={finalWinner}>{winner}</div>
      <div style={finalTeams}>
        {cleanTeamName(game?.team)} vs {cleanTeamName(game?.opponent)}
      </div>
      <div style={finalScoreLine}>
        <span>{homeScore}</span>
        <span style={finalDash}>-</span>
        <span>{awayScore}</span>
      </div>
      <div style={finalReturn}>Returning to schedule in {clock || "2:00"}</div>
    </div>
  );
}

function ScoreOnlySide({ team, score, clock, single = false }) {
  const logo = getLogo(team);
  return (
    <div style={single ? displaySingleSide : displaySide}>
      <div style={single ? displaySingleTop : displayTop}>
        {logo && <img src={logo} alt="" style={single ? displaySingleLogo : displayLogo} />}
        <div style={single ? displaySingleTeam : displayTeam}>{cleanTeamName(team)}</div>
      </div>
      <div style={single ? displaySingleScore : displayScore}>{score || 0}</div>
      <div style={single ? displaySingleClock : displayClock}>{clock || "0:00"}</div>
    </div>
  );
}

function DeviceOverlay({ field, fieldId, type, onSelect, onBack, onClose }) {
  const origin = window.location.origin;
  const href = type ? `${origin}/field-scoreboard/${fieldId}/${type}` : "";
  const label = type === "display/home" ? "Home Display iPad" : type === "display/away" ? "Away Display iPad" : "Add Displays";

  return (
    <div style={deviceOverlay}>
      <div style={devicePanel}>
        <div style={deviceHeader}>
          <div>
            <div style={deviceEyebrow}>{field?.name || "Field"}</div>
            <div style={deviceTitle}>{label}</div>
          </div>
          <button style={deviceCloseBtn} onClick={onClose}>Close</button>
        </div>

        {!type ? (
          <div style={deviceChoiceGrid}>
            <button style={deviceChoiceBtn} onClick={() => onSelect("display/home")}>
              <div style={deviceChoiceTitle}>Home Display</div>
              <div style={deviceChoiceText}>Scan for the home-side scoreboard.</div>
            </button>
            <button style={deviceChoiceBtn} onClick={() => onSelect("display/away")}>
              <div style={deviceChoiceTitle}>Away Display</div>
              <div style={deviceChoiceText}>Scan for the away-side scoreboard.</div>
            </button>
          </div>
        ) : (
          <div style={deviceQrWrap}>
            <div style={deviceQrFrame}>
              <QRCodeSVG value={href} size={360} level="M" includeMargin />
            </div>
            <a href={href} target="_blank" rel="noreferrer" style={deviceOpenLink}>Open Link</a>
            <button style={deviceBackBtn} onClick={onBack}>Choose Different Display</button>
          </div>
        )}
      </div>
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

function isTimeoutStatus(status) {
  return status === "timeout" || status === "timeout_home" || status === "timeout_away";
}

function isBreakStatus(status) {
  return status === "halftime" || isTimeoutStatus(status);
}

function getBreakLabel(liveGame, fallback = "display") {
  if (liveGame?.status === "halftime") return "Halftime";

  const game = liveGame?.schedule_master_auto;
  if (liveGame?.status === "timeout_home") return `${cleanTeamName(game?.team) || "Home"} Timeout`;
  if (liveGame?.status === "timeout_away") return `${cleanTeamName(game?.opponent) || "Away"} Timeout`;
  return fallback === "controller" ? "Timeout" : "Timeout";
}

function getGameClockButtonLabel(liveGame, clockSeconds, settings) {
  const fullGameClock = Number(settings.scoreboard_game_minutes || 24) * 60;
  if (Number(liveGame?.half || 1) === 1 && Number(clockSeconds || 0) === fullGameClock) {
    return "Start Game";
  }
  return "Resume Time";
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
const topExitBtn = { background: "#fee2e2", border: "none", borderRadius: 14, color: "#991b1b", cursor: "pointer", fontSize: 16, fontWeight: 900, minHeight: 48, padding: "14px 16px" };
const topEndBtn = { background: "#dc2626", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900, minHeight: 48, padding: "14px 16px" };
const displayLink = { background: "#111827", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900, minHeight: 48, padding: "14px 16px", textDecoration: "none" };
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
const boardPanel = { background: "#fff", borderRadius: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", height: "calc(100dvh - 142px)", marginTop: 14, overflow: "hidden", padding: 18 };
const controllerBreakBanner = { background: "#dbeafe", borderRadius: 14, color: "#1d4ed8", fontSize: "min(18px, 3dvh)", fontWeight: 900, marginBottom: 10, padding: "10px 14px", textAlign: "center" };
const controllerFinalPanel = { alignItems: "center", display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", textAlign: "center" };
const controllerFinalLabel = { color: "#16a34a", fontSize: "min(44px, 7dvh)", fontWeight: 900, textTransform: "uppercase" };
const controllerFinalScore = { color: "#0f172a", fontSize: "min(140px, 24dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.85, marginTop: 14 };
const controllerFinalSub = { color: "#64748b", fontSize: "min(24px, 4dvh)", fontWeight: 900, marginTop: 18 };
const timer = { color: "#0f172a", fontSize: "min(86px, 12dvh)", fontWeight: 900, lineHeight: 0.9, textAlign: "center" };
const timerActions = { display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 10 };
const primaryBtn = { background: "#16a34a", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 17, fontWeight: 900, minHeight: 50, padding: "13px 18px" };
const secondaryBtn = { background: "#e5e7eb", border: "none", borderRadius: 14, color: "#111827", cursor: "pointer", fontSize: 17, fontWeight: 900, minHeight: 50, padding: "13px 18px" };
const scoreGrid = { display: "grid", flex: 1, gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 16, minHeight: 0 };
const teamPanel = { background: "#f8fafc", borderRadius: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0, padding: 16, textAlign: "center" };
const teamHeader = { alignItems: "center", display: "flex", gap: 12, justifyContent: "center", minHeight: 72 };
const logoStyle = { height: "min(70px, 9dvh)", objectFit: "contain", width: "min(70px, 9dvh)" };
const teamName = { color: "#0f172a", fontSize: "min(28px, 4dvh)", fontWeight: 900, lineHeight: 1, textAlign: "left" };
const scoreText = { color: "#0f172a", fontSize: "min(112px, 17dvh)", fontWeight: 900, lineHeight: 0.82 };
const pointGrid = { display: "grid", gap: 10 };
const pointBtn = { background: "#2f6ea6", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: "min(18px, 2.6dvh)", fontWeight: 900, minHeight: 50, padding: "13px 10px" };
const undoGrid = { display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 10 };
const undoBtn = { background: "#fee2e2", border: "none", borderRadius: 12, color: "#991b1b", cursor: "pointer", fontSize: "min(16px, 2.3dvh)", fontWeight: 900, minHeight: 42, padding: "10px 8px" };
const timeoutTeamBtn = { background: "#fef3c7", border: "none", borderRadius: 14, color: "#92400e", cursor: "pointer", fontSize: "min(17px, 2.5dvh)", fontWeight: 900, marginTop: 10, minHeight: 48, padding: "12px 10px" };
const displayWrap = { background: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr", height: "100dvh", inset: 0, overflow: "hidden", position: "fixed", width: "100vw", zIndex: 999 };
const displaySingleWrap = { background: "#fff", display: "grid", height: "100dvh", inset: 0, overflow: "hidden", position: "fixed", width: "100vw", zIndex: 999 };
const displaySide = { alignItems: "center", borderRight: "0.7vw solid #111827", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(0, 18dvh) minmax(0, 66dvh) minmax(0, 12dvh)", height: "100dvh", justifyItems: "center", overflow: "hidden", padding: "1.4dvh 1.5vw" };
const displaySingleSide = { alignItems: "center", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(0, 18dvh) minmax(0, 67dvh) minmax(0, 11dvh)", height: "100dvh", justifyItems: "center", overflow: "hidden", padding: "1.6dvh 2vw" };
const displayTop = { alignItems: "center", display: "flex", gap: "1.4vw", justifyContent: "center", maxWidth: "46vw", minWidth: 0 };
const displaySingleTop = { alignItems: "center", display: "flex", gap: "2vw", justifyContent: "center", maxWidth: "96vw", minWidth: 0 };
const displayLogo = { height: "min(10dvh, 10vw)", maxHeight: "100%", objectFit: "contain", width: "min(10dvh, 10vw)" };
const displaySingleLogo = { height: "min(11dvh, 12vw)", maxHeight: "100%", objectFit: "contain", width: "min(11dvh, 12vw)" };
const displayTeam = { color: "#111827", fontSize: "min(4.4vw, 6.4dvh)", fontWeight: 900, lineHeight: 0.9, maxWidth: "34vw", overflowWrap: "anywhere", textAlign: "left" };
const displaySingleTeam = { color: "#111827", fontSize: "min(6.8vw, 8dvh)", fontWeight: 900, lineHeight: 0.86, maxWidth: "72vw", overflowWrap: "anywhere", textAlign: "left" };
const displayScore = { alignSelf: "center", color: "#111827", fontSize: "min(38vw, 66dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: 0, lineHeight: 0.64, maxWidth: "47vw", textAlign: "center" };
const displaySingleScore = { alignSelf: "center", color: "#111827", fontSize: "min(54vw, 74dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: 0, lineHeight: 0.6, maxWidth: "96vw", textAlign: "center" };
const displayClock = { alignSelf: "end", color: "#2563eb", fontSize: "min(9vw, 11dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.92, textAlign: "center" };
const displaySingleClock = { alignSelf: "end", color: "#2563eb", fontSize: "min(13vw, 11dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.92, textAlign: "center" };
const displayEmpty = { alignItems: "center", color: "#111827", display: "flex", flexDirection: "column", fontSize: "clamp(44px, 7vw, 112px)", fontWeight: 900, gridColumn: "1 / -1", height: "100dvh", justifyContent: "center", padding: "4dvh 4vw", textAlign: "center" };
const displayIdleTitle = { fontSize: "clamp(72px, 12vw, 180px)", fontWeight: 900, lineHeight: 0.95 };
const displayIdleSub = { color: "#64748b", fontSize: "clamp(34px, 5vw, 78px)", marginTop: "3vh" };
const displaySchedule = { alignItems: "center", boxSizing: "border-box", display: "flex", flexDirection: "column", gridColumn: "1 / -1", height: "100dvh", justifyContent: "center", overflow: "hidden", padding: "3dvh 3vw" };
const displayFieldName = { color: "#111827", fontSize: "min(12vw, 15dvh)", fontWeight: 900, lineHeight: 0.9, textAlign: "center" };
const displayWeekLabel = { color: "#2f6ea6", fontSize: "min(5.6vw, 7dvh)", fontWeight: 900, marginTop: "2dvh", textTransform: "uppercase" };
const displayGameList = { display: "grid", gap: "1.4dvh", marginTop: "2.4dvh", maxWidth: "94vw", width: "100%" };
const displayGameRow = { alignItems: "center", border: "0.45vw solid #111827", borderRadius: "1.5vw", boxSizing: "border-box", display: "grid", gap: "2vw", gridTemplateColumns: "18vw 1fr 22vw", minHeight: "10.5dvh", padding: "1.3dvh 2vw" };
const displayGameTime = { color: "#111827", fontSize: "min(4.8vw, 7dvh)", fontWeight: 900, lineHeight: 0.95 };
const displayGameTeams = { color: "#111827", fontSize: "min(5.2vw, 7.4dvh)", fontWeight: 900, lineHeight: 0.95, overflowWrap: "anywhere" };
const displayGameDivision = { color: "#475569", fontSize: "min(3.6vw, 5.2dvh)", fontWeight: 900, lineHeight: 1, textAlign: "right" };
const displayNoGames = { color: "#64748b", fontSize: "clamp(44px, 7vw, 108px)", fontWeight: 900, textAlign: "center" };
const breakDisplay = { alignItems: "center", background: "#fff", boxSizing: "border-box", display: "flex", flexDirection: "column", gridColumn: "1 / -1", height: "100dvh", justifyContent: "center", padding: "4dvh 4vw", width: "100vw" };
const breakLabel = { color: "#2563eb", fontSize: "min(12vw, 16dvh)", fontWeight: 900, lineHeight: 0.9, textTransform: "uppercase" };
const breakClock = { color: "#111827", fontSize: "min(42vw, 48dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.8, marginTop: "4dvh" };
const breakSub = { color: "#64748b", fontSize: "min(5vw, 6dvh)", fontWeight: 900, marginTop: "3dvh", textTransform: "uppercase" };
const finalDisplay = { alignItems: "center", background: "#fff", boxSizing: "border-box", display: "flex", flexDirection: "column", gridColumn: "1 / -1", height: "100dvh", justifyContent: "center", overflow: "hidden", padding: "3dvh 4vw", textAlign: "center", width: "100vw" };
const finalLabel = { color: "#16a34a", fontSize: "min(12vw, 15dvh)", fontWeight: 900, lineHeight: 0.86, textTransform: "uppercase" };
const finalWinner = { color: "#111827", fontSize: "min(9vw, 11dvh)", fontWeight: 900, lineHeight: 0.9, marginTop: "2dvh", overflowWrap: "anywhere" };
const finalTeams = { color: "#64748b", fontSize: "min(4.4vw, 5.4dvh)", fontWeight: 900, lineHeight: 1, marginTop: "1.6dvh", overflowWrap: "anywhere" };
const finalScoreLine = { alignItems: "center", color: "#111827", display: "flex", fontSize: "min(30vw, 36dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, gap: "3vw", lineHeight: 0.72, marginTop: "2.5dvh" };
const finalDash = { color: "#94a3b8", fontSize: "min(12vw, 14dvh)" };
const finalReturn = { color: "#2563eb", fontSize: "min(4vw, 5dvh)", fontWeight: 900, marginTop: "2dvh" };
const deviceOverlay = { alignItems: "center", background: "rgba(15,23,42,0.88)", boxSizing: "border-box", display: "flex", inset: 0, justifyContent: "center", padding: 18, position: "fixed", zIndex: 2000 };
const devicePanel = { background: "#fff", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", maxWidth: 760, padding: 20, width: "100%" };
const deviceHeader = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 14 };
const deviceEyebrow = { color: "#2563eb", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const deviceTitle = { color: "#0f172a", fontSize: 32, fontWeight: 900, marginTop: 2 };
const deviceCloseBtn = { background: "#e5e7eb", border: "none", borderRadius: 12, color: "#111827", cursor: "pointer", fontWeight: 900, padding: "10px 12px" };
const deviceChoiceGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 18 };
const deviceChoiceBtn = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, cursor: "pointer", padding: 18, textAlign: "left" };
const deviceChoiceTitle = { color: "#0f172a", fontSize: 22, fontWeight: 900 };
const deviceChoiceText = { color: "#64748b", fontSize: 14, fontWeight: 800, lineHeight: 1.4, marginTop: 8 };
const deviceQrWrap = { alignItems: "center", display: "flex", flexDirection: "column", gap: 14, marginTop: 18 };
const deviceQrFrame = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, display: "flex", padding: 14 };
const deviceOpenLink = { background: "#2563eb", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 900, padding: "12px 16px", textDecoration: "none" };
const deviceBackBtn = { background: "#f1f5f9", border: "none", borderRadius: 12, color: "#334155", cursor: "pointer", fontWeight: 900, padding: "12px 16px" };
