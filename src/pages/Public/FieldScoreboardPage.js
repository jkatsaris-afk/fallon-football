import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../supabase";
import { applyUuidSeasonFilter, getActiveSeason } from "../../utils/season";

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
  scoreboard_period_format: "half",
  scoreboard_game_minutes: 24,
  scoreboard_halftime_minutes: 5,
  scoreboard_timeout_seconds: 60,
  scoreboard_timeouts_per_half: 3,
  scoreboard_touchdown_points: 6,
  scoreboard_extra_one_points: 1,
  scoreboard_extra_two_points: 2,
  scoreboard_schedule_theme: "light",
  scoreboard_field_themes: {},
};
const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];
const FINAL_DISPLAY_SECONDS = 120;
const SCOREBOARD_CLOSED_MESSAGE = "Live scoreboard is turned off.";
const DISPLAY_THEME_STORAGE_KEY = "field-scoreboard-display-theme";
const FIELD_THEME_STORAGE_PREFIX = "field-scoreboard-display-theme-";

export default function FieldScoreboardPage({ mode = "control" }) {
  const fieldId = getFieldIdFromPath();
  const masterPage = mode === "master";
  const scoreOnly = mode === "display" || mode === "displayHome" || mode === "displayAway" || mode === "displayRef";
  const displaySideMode = mode === "displayHome" ? "home" : mode === "displayAway" ? "away" : mode === "displayRef" ? "ref" : "both";
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
  const [clockEditorOpen, setClockEditorOpen] = useState(false);
  const [hornReady, setHornReady] = useState(false);
  const [timeouts, setTimeouts] = useState(createTimeoutState(DEFAULT_SETTINGS.scoreboard_timeouts_per_half));
  const lastServerClockRef = useRef(null);
  const displaySyncKeyRef = useRef("");
  const displayClockAnchorRef = useRef({ seconds: DEFAULT_SETTINGS.scoreboard_game_minutes * 60, syncedAt: Date.now() });
  const gameClockBeforeBreakRef = useRef(DEFAULT_SETTINGS.scoreboard_game_minutes * 60);
  const audioContextRef = useRef(null);
  const previousDisplayClockRef = useRef(null);
  const lastDisplayHornKeyRef = useRef("");
  const controllerClockAnchorRef = useRef({ seconds: DEFAULT_SETTINGS.scoreboard_game_minutes * 60, startedAt: Date.now() });
  const lastControllerClockPersistRef = useRef(null);

  useEffect(() => {
    loadData();
    const refreshMs = scoreOnly ? 1500 : 3000;
    const interval = setInterval(() => {
      loadLiveGame();
      loadScoreboardSettings();
    }, refreshMs);
    const scheduleInterval = setInterval(loadData, 10000);
    return () => {
      clearInterval(interval);
      clearInterval(scheduleInterval);
    };
  }, [fieldId, scoreOnly]);

  useEffect(() => {
    if (!running || !liveGame) return undefined;

    const interval = setInterval(() => {
      const { seconds, startedAt } = controllerClockAnchorRef.current;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const next = Math.max(0, seconds - elapsed);
      const previousPersisted = lastControllerClockPersistRef.current;

      setClockSeconds((current) => (current === next ? current : next));

      if (previousPersisted !== next) {
        lastControllerClockPersistRef.current = next;
        if (Number(previousPersisted || 0) > 0 && next === 0) {
          playClockTone();
        }
        if (next === 0 && isBreakStatus(liveGame.status)) {
          finishBreakClock();
          return;
        }
        if (next === 0 && liveGame.status === "final_display") {
          finishFinalDisplay();
          return;
        }
        if (next === 0) {
          setRunning(false);
          updateLiveGame({ clock: formatClock(next), timeout_state: buildClockTimeoutState(next, false) }, false);
          return;
        }
        updateLiveGame({ clock: formatClock(next) }, false);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [running, liveGame?.id, liveGame?.status]);

  useEffect(() => {
    if (!running || !liveGame) return;
    controllerClockAnchorRef.current = { seconds: clockSeconds, startedAt: Date.now() };
    lastControllerClockPersistRef.current = clockSeconds;
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

  useEffect(() => {
    if (!scoreOnly || !liveGame?.horn_signal) return;

    const hornKey = `${liveGame.id}-${liveGame.horn_signal}`;
    if (lastDisplayHornKeyRef.current === hornKey) return;
    lastDisplayHornKeyRef.current = hornKey;
    playClockTone();
  }, [scoreOnly, liveGame?.id, liveGame?.horn_signal]);

  useEffect(() => {
    previousDisplayClockRef.current = null;
    lastDisplayHornKeyRef.current = "";
  }, [liveGame?.id]);

  useEffect(() => {
    if (!liveGame?.id || scoreOnly) return;

    const count = Number(settings.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
    setTimeouts(loadTimeoutState(liveGame.id, count, liveGame.timeout_state));
  }, [liveGame?.id, liveGame?.timeout_state, settings.scoreboard_timeouts_per_half, scoreOnly]);

  const getTimeoutUsage = (side, sourceGame = liveGame) => {
    const total = Number(settings.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
    const halfKey = getHalfKey(sourceGame);
    const sourceTimeouts = sourceGame?.id === liveGame?.id && !scoreOnly
      ? timeouts
      : normalizeTimeoutState(sourceGame?.timeout_state, total);
    const remaining = Number(sourceTimeouts?.[side]?.[halfKey] ?? total);

    return {
      total,
      remaining,
      used: Math.max(0, total - remaining),
    };
  };

  useEffect(() => {
    if (!scoreOnly || !liveGame) return;

    const previousClock = previousDisplayClockRef.current;
    const hornKey = `${liveGame.id}-${liveGame.status}-zero`;
    if (
      previousClock > 0 &&
      clockSeconds === 0 &&
      liveGame.status !== "final_display" &&
      lastDisplayHornKeyRef.current !== hornKey
    ) {
      lastDisplayHornKeyRef.current = hornKey;
      playClockTone();
    }
    previousDisplayClockRef.current = clockSeconds;
  }, [scoreOnly, liveGame?.id, liveGame?.status, clockSeconds]);

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

    const active = await getActiveSeason();
    const { data: gameData } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*")
      .in("field_id", relatedIds)
      .or("event_type.ilike.%game%,event_type.ilike.%champ%")
      .order("week", { ascending: true })
      .order("event_time", { ascending: true }), active);

    const gamesWithRefs = await attachRefAssignments(gameData || []);
    setGames(gamesWithRefs);

    setSelectedWeek((currentWeek) => currentWeek || String(gamesWithRefs?.[0]?.week || ""));

    await loadLiveGame(relatedIds);
  };

  const attachRefAssignments = async (gameRows) => {
    const gameIds = gameRows.map((game) => game.id).filter(Boolean);
    if (!gameIds.length) return gameRows;

    const { data: assignments, error } = await supabase
      .from("ref_assignments")
      .select("game_id, role, referee_id")
      .in("game_id", gameIds);

    if (error) {
      console.error("Display ref assignment load failed:", error);
      return gameRows;
    }

    const refereeIds = [...new Set((assignments || []).map((assignment) => assignment.referee_id).filter(Boolean))];
    const refereesById = {};

    if (refereeIds.length) {
      const { data: refereeRows, error: refereeError } = await supabase
        .from("referees")
        .select("id, first_name, last_name")
        .in("id", refereeIds);

      if (refereeError) {
        console.error("Display referee name load failed:", refereeError);
      }

      (refereeRows || []).forEach((referee) => {
        refereesById[referee.id] = referee;
      });
    }

    const assignmentsByGame = {};
    (assignments || []).forEach((assignment) => {
      if (!assignment.game_id) return;
      if (!assignmentsByGame[assignment.game_id]) assignmentsByGame[assignment.game_id] = [];
      assignmentsByGame[assignment.game_id].push(assignment);
    });

    return gameRows.map((game) => ({
      ...game,
      assigned_refs: (assignmentsByGame[game.id] || [])
        .filter((assignment) => assignment.referee_id)
        .sort((a, b) => String(a.role || "").localeCompare(String(b.role || "")))
        .map((assignment) => ({
          role: assignment.role,
          name: `${refereesById[assignment.referee_id]?.first_name || ""} ${refereesById[assignment.referee_id]?.last_name || ""}`.trim(),
        }))
        .filter((assignment) => assignment.name),
    }));
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

    const savedDisplayTheme = loadSavedFieldDisplayTheme(fieldId) || loadSavedDisplayTheme();
    const fieldThemes = normalizeFieldThemes(settingsData?.scoreboard_field_themes);
    const mergedSettings = {
      ...DEFAULT_SETTINGS,
      ...(settingsData || {}),
      scoreboard_field_themes: {
        ...fieldThemes,
        ...(savedDisplayTheme ? { [fieldId]: savedDisplayTheme } : {}),
      },
    };
    setSettings(mergedSettings);
    return mergedSettings;
  };

  const loadLiveGame = async (fieldIds = scoreboardFieldIds) => {
    const { data, error } = await supabase
      .from("games_live")
      .select("*")
      .in("status", LIVE_GAME_STATUSES)
      .order("created_at", { ascending: false })
      .limit(100);

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
      schedule_master_auto: normalizeScoreboardGame(scheduleById[row.schedule_id]),
    }));

    const active = hydratedRows.find((row) => fieldIds.includes(row.schedule_master_auto?.field_id));
    if (!active) {
      if (scoreOnly && liveGame && isBreakStatus(liveGame.status) && Number(previousDisplayClockRef.current || 0) <= 2) {
        const hornKey = `${liveGame.id}-${liveGame.status}-closed`;
        if (lastDisplayHornKeyRef.current !== hornKey) {
          lastDisplayHornKeyRef.current = hornKey;
          playClockTone();
        }
      }
      lastServerClockRef.current = null;
      displaySyncKeyRef.current = "";
      displayClockAnchorRef.current = { seconds: 0, syncedAt: Date.now() };
      setDisplayClockRunning(false);
      setLiveGame(null);
      return;
    }

    const serverClockSeconds = getAnchoredClockSeconds(
      active,
      clockToSeconds(active.clock || formatClock(settings.scoreboard_game_minutes * 60))
    );
    if (
      scoreOnly &&
      liveGame?.id === active.id &&
      liveGame?.status !== active.status &&
      isBreakStatus(liveGame.status) &&
      Number(previousDisplayClockRef.current || clockSeconds || 0) <= 2
    ) {
      const hornKey = `${active.id}-${liveGame.status}-transition`;
      if (lastDisplayHornKeyRef.current !== hornKey) {
        lastDisplayHornKeyRef.current = hornKey;
        playClockTone();
      }
    }

    if (scoreOnly) {
      const previousServerClock = lastServerClockRef.current;
      const serverClockMoving = previousServerClock !== null && serverClockSeconds < previousServerClock;
      const breakClockRunning = isBreakStatus(active.status) && serverClockSeconds > 0;
      const anchoredClockRunning = isClockAnchorRunning(active);
      setDisplayClockRunning(serverClockMoving || breakClockRunning || anchoredClockRunning);
      const syncKey = `${active.id}-${active.status}`;
      const { seconds, syncedAt } = displayClockAnchorRef.current;
      const localEstimate = Math.max(0, seconds - Math.floor((Date.now() - syncedAt) / 1000));
      const shouldHardSync = displaySyncKeyRef.current !== syncKey || Math.abs(localEstimate - serverClockSeconds) > 2 || (!serverClockMoving && !breakClockRunning && !anchoredClockRunning);
      if (shouldHardSync) {
        displayClockAnchorRef.current = { seconds: serverClockSeconds, syncedAt: Date.now() };
        displaySyncKeyRef.current = syncKey;
        setClockSeconds(serverClockSeconds);
      }
      lastServerClockRef.current = serverClockSeconds;
    } else {
      setClockSeconds(serverClockSeconds);
      setRunning(isClockAnchorRunning(active));
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
    primeClockTone();

    if (!scoreboardsOpen) {
      setStatus({ type: "error", message: SCOREBOARD_CLOSED_MESSAGE });
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

    await closeLiveGamesForCurrentField(game.id);
    const initialTheme = getFieldDisplayTheme(settings, fieldId);
    const initialTimeoutState = createTimeoutStateWithTheme(
      Number(settings.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half),
      initialTheme
    );

    const row = {
      schedule_id: game.id,
      home_score: 0,
      away_score: 0,
      clock: formatClock(Number(settings.scoreboard_game_minutes || 24) * 60),
      status: "live",
      quarter: 1,
      half: 1,
      timeout_state: initialTimeoutState,
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

      setLiveGame({ ...data, schedule_master_auto: normalizeScoreboardGame(game) });
      setClockSeconds(clockToSeconds(row.clock));
      await resetTimeoutsForLiveGame(data.id, initialTheme);
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

    setLiveGame({ ...data, schedule_master_auto: normalizeScoreboardGame(game) });
    setClockSeconds(clockToSeconds(row.clock));
    await resetTimeoutsForLiveGame(data.id, initialTheme);
    setRunning(false);
  };

  const closeLiveGamesForCurrentField = async (currentScheduleId) => {
    const { data: activeLiveGames, error } = await supabase
      .from("games_live")
      .select("id, schedule_id")
      .in("status", LIVE_GAME_STATUSES);

    if (error) {
      console.error("Live game field cleanup failed:", error);
      return;
    }

    const scheduleIds = [...new Set((activeLiveGames || []).map((row) => row.schedule_id).filter(Boolean))];
    if (!scheduleIds.length) return;

    const { data: scheduleRows, error: scheduleError } = await supabase
      .from("schedule_master_auto")
      .select("id, field_id")
      .in("id", scheduleIds);

    if (scheduleError) {
      console.error("Live game schedule cleanup failed:", scheduleError);
      return;
    }

    const fieldByScheduleId = {};
    (scheduleRows || []).forEach((row) => {
      fieldByScheduleId[row.id] = row.field_id;
    });

    const liveIdsToClose = (activeLiveGames || [])
      .filter((row) => row.schedule_id !== currentScheduleId)
      .filter((row) => scoreboardFieldIds.includes(fieldByScheduleId[row.schedule_id]))
      .map((row) => row.id);

    if (!liveIdsToClose.length) return;

    const { error: closeError } = await supabase
      .from("games_live")
      .update({ status: "closed" })
      .in("id", liveIdsToClose);

    if (closeError) {
      console.error("Close same-field live games failed:", closeError);
    }
  };

  const startBreakClock = async (type, side = null) => {
    primeClockTone();

    if (!liveGame) return;
    if (isBreakStatus(liveGame.status) || liveGame.status === "final_display") return;

    const gameClock = clockSeconds;
    const statusValue = type === "timeout" && side ? `timeout_${side}` : type;
    const seconds = type === "halftime"
      ? Number(settings.scoreboard_halftime_minutes || 5) * 60
      : getTimeoutSeconds(settings);
    let timeoutStateUpdate = normalizeTimeoutState(liveGame.timeout_state, Number(settings.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half));

    if (type === "timeout") {
      const halfKey = getHalfKey(liveGame);
      const remaining = getTimeoutsRemaining(side);
      if (remaining <= 0) {
        const teamLabel = side === "home" ? cleanTeamName(liveGame.schedule_master_auto?.team) || "Home" : cleanTeamName(liveGame.schedule_master_auto?.opponent) || "Away";
        setStatus({ type: "error", message: `${teamLabel} has no timeouts left in this half.` });
        return;
      }

      const nextTimeouts = {
        ...timeouts,
        [side]: {
          ...(timeouts[side] || {}),
          [halfKey]: remaining - 1,
        },
      };
      setTimeouts(nextTimeouts);
      saveTimeoutState(liveGame.id, nextTimeouts);
      timeoutStateUpdate = nextTimeouts;
      gameClockBeforeBreakRef.current = gameClock;
    }

    const nextTimeoutState = buildClockTimeoutState(seconds, true, statusValue, timeoutStateUpdate);
    setRunning(false);
    setClockSeconds(seconds);
    await updateLiveGame({
      status: statusValue,
      clock: formatClock(seconds),
      quarter: type === "timeout" ? gameClock : liveGame.quarter,
      timeout_state: nextTimeoutState,
    });
    setRunning(true);
  };

  const resetTimeoutsForLiveGame = async (liveGameId, theme = getFieldDisplayTheme(settings, fieldId)) => {
    const count = Number(settings.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
    const nextTimeouts = createTimeoutStateWithTheme(count, theme);
    setTimeouts(nextTimeouts);
    saveTimeoutState(liveGameId, nextTimeouts);
    await supabase.from("games_live").update({ timeout_state: nextTimeouts }).eq("id", liveGameId);
  };

  const getTimeoutsRemaining = (side) => {
    return getTimeoutUsage(side).remaining;
  };

  const finishBreakClock = async () => {
    if (!liveGame) return;
    const nextClock = isTimeoutStatus(liveGame.status)
      ? Number(liveGame.quarter || gameClockBeforeBreakRef.current || Number(settings.scoreboard_game_minutes || 24) * 60)
      : Number(settings.scoreboard_game_minutes || 24) * 60;
    const hornSignal = String(Date.now());

    setRunning(false);
    setClockSeconds(nextClock);
    await updateLiveGame({
      status: "live",
      clock: formatClock(nextClock),
      half: liveGame.status === "halftime" ? 2 : liveGame.half,
      quarter: liveGame.status === "halftime" ? 2 : 1,
      horn_signal: hornSignal,
      timeout_state: buildClockTimeoutState(nextClock, false, "live"),
    });
  };

  const triggerHorn = async () => {
    playClockTone();
    if (!liveGame) return;
    await updateLiveGame({ horn_signal: String(Date.now()) });
  };

  const openClockEditor = () => {
    setRunning(false);
    if (liveGame) {
      updateLiveGame({ clock: formatClock(clockSeconds), timeout_state: buildClockTimeoutState(clockSeconds, false) });
    }
    setClockEditorOpen(true);
  };

  const saveEditedClock = async (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds || 0));
    setRunning(false);
    setClockSeconds(safeSeconds);
    await updateLiveGame({ clock: formatClock(safeSeconds), timeout_state: buildClockTimeoutState(safeSeconds, false) });
    setClockEditorOpen(false);
    setStatus({ type: "success", message: `Clock updated to ${formatClock(safeSeconds)}.` });
  };

  const getTimeoutButtonLabel = (side) => {
    const team = side === "home" ? liveGame?.schedule_master_auto?.team : liveGame?.schedule_master_auto?.opponent;
    const usage = getTimeoutUsage(side);
    return `${cleanTeamName(team) || (side === "home" ? "Home" : "Away")} Timeout (${usage.remaining})`;
  };

  const buildClockTimeoutState = (seconds, clockRunning, status = liveGame?.status, sourceTimeoutState = liveGame?.timeout_state) => {
    const total = Number(settings.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
    const currentTimeoutState = normalizeTimeoutState(sourceTimeoutState, total);
    return {
      ...currentTimeoutState,
      clock_anchor: {
        running: Boolean(clockRunning),
        seconds: Math.max(0, Number(seconds || 0)),
        started_at: Date.now(),
        status,
      },
    };
  };

  const setLiveClockRunning = async (nextRunning) => {
    if (!liveGame) return;

    let nextSeconds = clockSeconds;
    if (!nextRunning && running) {
      const { seconds, startedAt } = controllerClockAnchorRef.current;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      nextSeconds = Math.max(0, seconds - elapsed);
    }

    controllerClockAnchorRef.current = { seconds: nextSeconds, startedAt: Date.now() };
    lastControllerClockPersistRef.current = nextSeconds;
    setClockSeconds(nextSeconds);
    setRunning(nextRunning);
    await updateLiveGame({
      clock: formatClock(nextSeconds),
      timeout_state: buildClockTimeoutState(nextSeconds, nextRunning),
    });
  };

  const setDisplayTheme = async (theme) => {
    const safeTheme = theme === "dark" ? "dark" : "light";
    saveFieldDisplayThemePreference(fieldId, safeTheme);
    setSettings((current) => ({
      ...current,
      scoreboard_field_themes: {
        ...normalizeFieldThemes(current.scoreboard_field_themes),
        [fieldId]: safeTheme,
      },
    }));

    if (liveGame) {
      const total = Number(settings.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
      const currentTimeoutState = normalizeTimeoutState(liveGame.timeout_state, total);
      const nextTimeoutState = {
        ...currentTimeoutState,
        display_theme: safeTheme,
      };

      setTimeouts(nextTimeoutState);
      saveTimeoutState(liveGame.id, nextTimeoutState);
      await updateLiveGame({ timeout_state: nextTimeoutState });
      await saveFieldDisplayTheme(safeTheme, false);
      return;
    }

    await saveFieldDisplayTheme(safeTheme, true);
  };

  const saveFieldDisplayTheme = async (theme, showError = true) => {
    const currentFieldThemes = normalizeFieldThemes(settings.scoreboard_field_themes);
    const nextFieldThemes = {
      ...currentFieldThemes,
      [fieldId]: theme,
    };

    const { data, error } = await supabase
      .from("app_settings")
      .update({
        scoreboard_field_themes: nextFieldThemes,
        scoreboard_schedule_theme: theme,
      })
      .eq("id", 1)
      .select("id");

    if (error) {
      console.error("Field display theme update failed:", error);
      if (showError) {
        setStatus({ type: "error", message: "Could not save this field's display theme. Add scoreboard_field_themes to app_settings, then try again." });
      }
      return;
    }

    if (!data?.length) {
      const { error: insertError } = await supabase
        .from("app_settings")
        .insert({ id: 1, scoreboard_field_themes: nextFieldThemes, scoreboard_schedule_theme: theme });

      if (insertError) {
        console.error("Field display theme insert failed:", insertError);
        if (showError) {
          setStatus({ type: "error", message: "Could not save this field's display theme. Add scoreboard_field_themes to app_settings, then try again." });
        }
      }
    }
  };

  const finishFinalDisplay = async () => {
    if (!liveGame) return;

    setRunning(false);
    await supabase.from("games_live").update({ status: "final" }).eq("id", liveGame.id);
    if (isTestGame(liveGame.schedule_master_auto)) {
      await supabase.from("schedule_master_auto").delete().eq("id", liveGame.schedule_id);
    }
    setLiveGame(null);
    await loadData();
  };

  const startTestGame = async () => {
    if (!scoreboardsOpen) {
      setStatus({ type: "error", message: SCOREBOARD_CLOSED_MESSAGE });
      return;
    }

    setStatus(null);
    const testSchedule = {
      field_id: fieldId,
      field: field?.name || "Test Field",
      event_type: "scoreboard test",
      source: "scoreboard-test",
      team: "Ravens",
      opponent: "Chiefs",
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

    let nextUpdates = updates;
    let { error } = await supabase
      .from("games_live")
      .update(nextUpdates)
      .eq("id", liveGame.id);

    if (error && (nextUpdates.timeout_state || nextUpdates.horn_signal)) {
      console.warn("Live game optional scoreboard field update failed, retrying without it:", error);
      const { timeout_state, horn_signal, ...fallbackUpdates } = nextUpdates;
      nextUpdates = fallbackUpdates;
      const fallbackResult = await supabase
        .from("games_live")
        .update(nextUpdates)
        .eq("id", liveGame.id);
      error = fallbackResult.error;
    }

    if (error) {
      console.error("Live game update failed:", error);
      return;
    }

    if (refresh) setLiveGame((current) => ({ ...current, ...updates }));
  };

  function primeClockTone() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
      setHornReady(true);
      return true;
    } catch (error) {
      console.warn("Clock tone could not be prepared:", error);
      return false;
    }
  }

  function playClockTone() {
    try {
      primeClockTone();
      const context = audioContextRef.current;
      if (!context) return;

      const now = context.currentTime;
      const duration = 2.15;
      const masterGain = context.createGain();
      const filter = context.createBiquadFilter();
      const compressor = context.createDynamicsCompressor();

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(520, now);
      filter.Q.setValueAtTime(1.4, now);

      compressor.threshold.setValueAtTime(-24, now);
      compressor.knee.setValueAtTime(10, now);
      compressor.ratio.setValueAtTime(16, now);
      compressor.attack.setValueAtTime(0.002, now);
      compressor.release.setValueAtTime(0.18, now);

      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.95, now + 0.018);
      masterGain.gain.setValueAtTime(0.95, now + 1.85);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      filter.connect(compressor);
      compressor.connect(masterGain);
      masterGain.connect(context.destination);

      [440, 554, 659, 880, 1108].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = index < 3 ? "sawtooth" : "square";
        oscillator.frequency.setValueAtTime(frequency, now);

        const voiceGain = context.createGain();
        voiceGain.gain.setValueAtTime(index < 2 ? 0.32 : 0.14, now);

        oscillator.connect(voiceGain);
        voiceGain.connect(filter);
        oscillator.start(now);
        oscillator.stop(now + duration);
      });

      const noiseBuffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i += 1) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.18;
      }
      const noise = context.createBufferSource();
      const noiseGain = context.createGain();
      const noiseFilter = context.createBiquadFilter();
      noise.buffer = noiseBuffer;
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(1400, now);
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.18, now + 0.025);
      noiseGain.gain.setValueAtTime(0.16, now + 1.75);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(compressor);
      noise.start(now);
      noise.stop(now + duration);
    } catch (error) {
      console.warn("Clock tone could not play:", error);
    }
  }

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
      await showFinalDisplay("Test final showing for 2 minutes. No season score was saved.");
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

    await showFinalDisplay("Final score saved. Showing final score for 2 minutes.");
  };

  const showFinalDisplay = async (message) => {
    const finalClock = formatClock(FINAL_DISPLAY_SECONDS);
    await updateLiveGame({
      status: "final_display",
      clock: finalClock,
      timeout_state: buildClockTimeoutState(FINAL_DISPLAY_SECONDS, true, "final_display"),
    });
    setClockSeconds(FINAL_DISPLAY_SECONDS);
    setRunning(true);
    setLiveGame((current) => current ? { ...current, status: "final_display", clock: finalClock } : current);
    setStatus({ type: "success", message });
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
        settings={settings}
        hornReady={hornReady}
        onEnableHorn={() => {
          primeClockTone();
          setHornReady(true);
          playClockTone();
        }}
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
              : SCOREBOARD_CLOSED_MESSAGE}
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
          <div style={closedPanel}>{SCOREBOARD_CLOSED_MESSAGE}</div>
        )}
      </div>
    );
  }

  return (
    <div style={liveGame ? liveControlWrap : controlWrap}>
      <div style={liveGame ? liveTopBar : topBar}>
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
          <button
            style={{
              ...themeToggleBtn,
              ...(getActiveDisplayTheme(liveGame, settings, fieldId) === "light" ? themeToggleActive : {}),
            }}
            onClick={() => setDisplayTheme("light")}
          >
            Light
          </button>
          <button
            style={{
              ...themeToggleBtn,
              ...(getActiveDisplayTheme(liveGame, settings, fieldId) === "dark" ? themeToggleActive : {}),
            }}
            onClick={() => setDisplayTheme("dark")}
          >
            Dark
          </button>
        </div>
      </div>

      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      {!scoreboardsOpen && (
        <div style={closedPanel}>{SCOREBOARD_CLOSED_MESSAGE}</div>
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
              <div style={testLogoRow}>
                <TestTileTeam team="Ravens" />
                <span style={testVs}>vs</span>
                <TestTileTeam team="Chiefs" />
              </div>
              <div style={gameMeta}>Ravens vs Chiefs • does not save to season scores</div>
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
        <div style={liveGame ? liveBoardPanel : boardPanel}>
          {liveGame.status === "final_display" ? (
            <div style={controllerFinalPanel}>
              <div style={controllerFinalLabel}>Final</div>
              <div style={controllerFinalScore}>
                {liveGame.home_score || 0} - {liveGame.away_score || 0}
              </div>
              <div style={controllerFinalSub}>
                Displays will return to the field schedule in {formatClock(clockSeconds)}.
              </div>
              <button type="button" style={controllerFinalCloseBtn} onClick={finishFinalDisplay}>
                Close Final Screen
              </button>
            </div>
          ) : (
            <>
              {isBreakStatus(liveGame.status) && (
                <div style={controllerBreakBanner}>
                  {getBreakLabel(liveGame, "controller")} countdown running. {getPeriodName(settings)} clock is paused.
                </div>
              )}
              <div style={timer}>{formatClock(clockSeconds)}</div>
              <div style={timerActions}>
                {isBreakStatus(liveGame.status) ? (
                  <button style={primaryBtn} onClick={finishBreakClock}>
                    End {liveGame.status === "halftime" ? "Halftime" : "Timeout"}
                  </button>
                ) : (
                  <>
                    <button
                      style={timeoutControlBtn}
                      disabled={getTimeoutsRemaining("home") <= 0}
                      onClick={() => startBreakClock("timeout", "home")}
                    >
                      {getTimeoutButtonLabel("home")}
                    </button>
                    <button
                      style={primaryBtn}
                      onClick={() => {
                        primeClockTone();
                        setLiveClockRunning(!running);
                      }}
                    >
                      {running ? "Pause" : getGameClockButtonLabel(liveGame, clockSeconds, settings)}
                    </button>
                    <button
                      style={secondaryBtn}
                      onClick={openClockEditor}
                    >
                      Edit Clock
                    </button>
                    <button
                      style={secondaryBtn}
                      onClick={() => startBreakClock("halftime")}
                    >
                      Halftime
                    </button>
                    <button
                      style={hornBtn}
                      onClick={triggerHorn}
                    >
                      Horn
                    </button>
                    <button
                      style={timeoutControlBtn}
                      disabled={getTimeoutsRemaining("away") <= 0}
                      onClick={() => startBreakClock("timeout", "away")}
                    >
                      {getTimeoutButtonLabel("away")}
                    </button>
                  </>
                )}
              </div>

              <div style={scoreGrid}>
                <TeamControls
                  team={liveGame.schedule_master_auto?.team}
                  score={liveGame.home_score}
                  half={getHalfKey(liveGame)}
                  timeoutUsage={getTimeoutUsage("home")}
                  onAdd={(points) => addPoints("home", points)}
                  onRemove={(points) => removePoints("home", points)}
                  settings={settings}
                  disabled={isBreakStatus(liveGame.status)}
                />
                <TeamControls
                  team={liveGame.schedule_master_auto?.opponent}
                  score={liveGame.away_score}
                  half={getHalfKey(liveGame)}
                  timeoutUsage={getTimeoutUsage("away")}
                  onAdd={(points) => addPoints("away", points)}
                  onRemove={(points) => removePoints("away", points)}
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
      {clockEditorOpen && (
        <ClockEditor
          currentSeconds={clockSeconds}
          maxMinutes={Math.max(Number(settings.scoreboard_game_minutes || 24), Math.ceil(clockSeconds / 60), 1)}
          onSave={saveEditedClock}
          onClose={() => setClockEditorOpen(false)}
        />
      )}
    </div>
  );
}

function ClockEditor({ currentSeconds, maxMinutes, onSave, onClose }) {
  const [minutes, setMinutes] = useState(String(Math.floor(Number(currentSeconds || 0) / 60)));
  const [seconds, setSeconds] = useState(String(Number(currentSeconds || 0) % 60).padStart(2, "0"));

  const commit = () => {
    const minuteValue = Math.max(0, Number(minutes || 0));
    const secondValue = Math.min(59, Math.max(0, Number(seconds || 0)));
    onSave((minuteValue * 60) + secondValue);
  };

  return (
    <div style={clockEditorOverlay}>
      <div style={clockEditorPanel}>
        <div style={clockEditorHeader}>
          <div>
            <div style={deviceEyebrow}>Clock Correction</div>
            <div style={clockEditorTitle}>Set Game Clock</div>
          </div>
          <button type="button" style={deviceCloseBtn} onClick={onClose}>Close</button>
        </div>
        <div style={clockEditorTime}>
          <label style={clockEditorField}>
            <span style={clockEditorLabel}>Minutes</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max={String(Math.max(maxMinutes, 99))}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              style={clockEditorInput}
            />
          </label>
          <div style={clockEditorColon}>:</div>
          <label style={clockEditorField}>
            <span style={clockEditorLabel}>Seconds</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              value={seconds}
              onChange={(event) => setSeconds(event.target.value)}
              onBlur={() => {
                const safeSeconds = Math.min(59, Math.max(0, Number(seconds || 0)));
                setSeconds(String(safeSeconds).padStart(2, "0"));
              }}
              style={clockEditorInput}
            />
          </label>
        </div>
        <button type="button" style={clockEditorSaveBtn} onClick={commit}>
          Set Clock
        </button>
      </div>
    </div>
  );
}

function TeamControls({ team, score, timeoutUsage, onAdd, onRemove, settings, disabled = false }) {
  const logo = getLogo(team);

  return (
    <div style={teamPanel}>
      <div style={teamHeader}>
        {logo && <img src={logo} alt="" style={logoStyle} />}
        <div style={teamName}>{cleanTeamName(team)}</div>
      </div>
      <TimeoutDots total={timeoutUsage?.total} used={timeoutUsage?.used} />
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
    </div>
  );
}

function DisplayScheduleTeam({ team, dark = false }) {
  const logo = getLogo(team);

  return (
    <span style={displayScheduleTeam}>
      {logo && (
        <span style={dark ? displayScheduleLogoPillDark : displayScheduleLogoPill}>
          <img src={logo} alt="" style={displayScheduleLogo} />
        </span>
      )}
      <span>{cleanTeamName(team)}</span>
    </span>
  );
}

function TestTileTeam({ team }) {
  const logo = getLogo(team);

  return (
    <span style={testTileTeam}>
      {logo && <img src={logo} alt="" style={testTileLogo} />}
      <span>{cleanTeamName(team)}</span>
    </span>
  );
}

function ScoreOnlyBoard({
  field,
  liveGame,
  liveClock,
  games = [],
  scoreboardsOpen = true,
  sideMode = "both",
  settings = DEFAULT_SETTINGS,
  hornReady = false,
  onEnableHorn,
}) {
  const game = liveGame?.schedule_master_auto;
  const weekLabel = games[0]?.week ? `Week ${games[0].week}` : "Scheduled Games";
  const refMode = sideMode === "ref";
  const singleSide = sideMode === "home" || sideMode === "away";
  const singleTeam = sideMode === "home" ? game?.team : game?.opponent;
  const singleScore = sideMode === "home" ? liveGame?.home_score : liveGame?.away_score;
  const singleOpponent = sideMode === "home" ? game?.opponent : game?.team;
  const singleOpponentScore = sideMode === "home" ? liveGame?.away_score : liveGame?.home_score;
  const homeTimeouts = getTimeoutUsageForGame(liveGame, "home", settings);
  const awayTimeouts = getTimeoutUsageForGame(liveGame, "away", settings);
  const breakMode = isBreakStatus(liveGame?.status);
  const finalMode = liveGame?.status === "final_display";
  const scheduleDark = getFieldDisplayTheme(settings, field?.id || game?.field_id) === "dark";

  return (
    <div style={singleSide ? displaySingleWrap : displayWrap}>
      {scoreboardsOpen && liveGame && !refMode && (
        <div style={displayFieldCorner}>{field?.name || game?.field || "Field"}</div>
      )}

      {!hornReady && (
        <button type="button" style={displayHornButton} onClick={onEnableHorn}>
          Enable Horn
        </button>
      )}

      {!scoreboardsOpen && (
        <div style={displayEmpty}>
          <div style={displayIdleTitle}>{field?.name || "Field"}</div>
          <div style={displayIdleSub}>{SCOREBOARD_CLOSED_MESSAGE}</div>
        </div>
      )}

      {scoreboardsOpen && !liveGame && (
        <div style={{ ...displaySchedule, ...(scheduleDark ? displayDarkSurface : {}) }}>
          <div style={{ ...displayFieldName, ...(scheduleDark ? combinedTextDark : {}) }}>{field?.name || "Field"}</div>
          <div style={{ ...displayWeekLabel, ...(scheduleDark ? mutedTextDark : {}) }}>{weekLabel}</div>
          <div style={displayGameList}>
            {games.length ? games.map((scheduledGame) => (
              <div key={scheduledGame.id} style={{ ...displayGameRow, ...(scheduleDark ? displayGameRowDark : {}) }}>
                <div style={{ ...displayGameTime, ...(scheduleDark ? combinedTextDark : {}) }}>{scheduledGame.event_time || scheduledGame.time || "Time TBD"}</div>
                <div style={displayGameMain}>
                  <div style={{ ...displayGameTeamsRow, ...(scheduleDark ? combinedTextDark : {}) }}>
                    <DisplayScheduleTeam team={scheduledGame.team} dark={scheduleDark} />
                    <span style={{ ...displayGameVs, ...(scheduleDark ? mutedTextDark : {}) }}>vs</span>
                    <DisplayScheduleTeam team={scheduledGame.opponent} dark={scheduleDark} />
                  </div>
                  <div style={{ ...displayGameRefs, ...(scheduleDark ? mutedTextDark : {}) }}>
                    Refs: {formatAssignedRefs(scheduledGame.assigned_refs)}
                  </div>
                </div>
                <div style={displayGameMetaBlock}>
                  <div style={{ ...displayGameDivision, ...(scheduleDark ? combinedTextDark : {}) }}>{scheduledGame.division || "Division TBD"}</div>
                  <div style={{ ...displayGameField, ...(scheduleDark ? mutedTextDark : {}) }}>{scheduledGame.field || field?.name || "Field TBD"}</div>
                </div>
              </div>
            )) : (
              <div style={{ ...displayNoGames, ...(scheduleDark ? mutedTextDark : {}) }}>No scheduled games found for this field.</div>
            )}
          </div>
        </div>
      )}

      {scoreboardsOpen && liveGame && breakMode && !refMode && (
        <BreakClockDisplay
          label={getBreakLabel(liveGame)}
          clock={liveClock || liveGame.clock}
          game={game}
          liveGame={liveGame}
          settings={settings}
          theme={getDisplayTheme(liveGame)}
        />
      )}

      {scoreboardsOpen && liveGame && finalMode && (
        <FinalScoreDisplay game={game} liveGame={liveGame} theme={getDisplayTheme(liveGame)} />
      )}

      {scoreboardsOpen && liveGame && refMode && !finalMode && (
        <RefScoreboardDisplay
          field={field}
          game={game}
          liveGame={liveGame}
          clock={liveClock || liveGame.clock}
          homeTimeouts={homeTimeouts}
          awayTimeouts={awayTimeouts}
          statusLabel={breakMode ? getBreakLabel(liveGame) : "Live"}
          theme={getDisplayTheme(liveGame)}
        />
      )}

      {scoreboardsOpen && liveGame && singleSide && (
        !breakMode && !finalMode && (
          <ScoreOnlySide
            team={singleTeam}
            score={singleScore}
            clock={liveClock || liveGame.clock}
            timeoutUsage={sideMode === "home" ? homeTimeouts : awayTimeouts}
            opponentName={singleOpponent}
            opponentScore={singleOpponentScore}
            single
          />
        )
      )}

      {scoreboardsOpen && liveGame && !singleSide && (
        !refMode && !breakMode && !finalMode && (
          <CombinedScoreboardDisplay
            game={game}
            liveGame={liveGame}
            clock={liveClock || liveGame.clock}
            homeTimeouts={homeTimeouts}
            awayTimeouts={awayTimeouts}
            theme={getDisplayTheme(liveGame)}
          />
        )
      )}
    </div>
  );
}

function CombinedScoreboardDisplay({ game, liveGame, clock, homeTimeouts, awayTimeouts, theme = "light" }) {
  const dark = theme === "dark";

  return (
    <div style={{ ...combinedDisplay, ...(dark ? combinedDisplayDark : {}) }}>
      <div style={{ ...combinedClock, ...(dark ? combinedTextDark : {}) }}>{clock || "0:00"}</div>
      <div style={combinedTeams}>
        <CombinedTeamPanel
          team={game?.team}
          score={liveGame?.home_score}
          timeoutUsage={homeTimeouts}
          dark={dark}
        />
        <CombinedTeamPanel
          team={game?.opponent}
          score={liveGame?.away_score}
          timeoutUsage={awayTimeouts}
          divider
          dark={dark}
        />
      </div>
    </div>
  );
}

function CombinedTeamPanel({ team, score, timeoutUsage, divider = false, dark = false }) {
  const logo = getLogo(team);

  return (
    <div style={{ ...combinedTeamPanel, ...(divider ? (dark ? combinedTeamDividerDark : combinedTeamDivider) : {}) }}>
      <div style={combinedTeamHeader}>
        {logo && (
          <span style={dark ? combinedLogoPillDark : combinedLogoPill}>
            <img src={logo} alt="" style={combinedLogo} />
          </span>
        )}
        <div style={{ ...combinedTeamName, ...(dark ? combinedTextDark : {}) }}>{cleanTeamName(team)}</div>
      </div>
      <div style={{ ...combinedScore, ...(dark ? combinedTextDark : {}) }}>{Number(score || 0)}</div>
      <TimeoutDots total={timeoutUsage?.total} used={timeoutUsage?.used} display dark={dark} />
    </div>
  );
}

function RefScoreboardDisplay({ field, game, liveGame, clock, homeTimeouts, awayTimeouts, statusLabel, theme = "light" }) {
  const dark = theme === "dark";

  return (
    <div style={{ ...refDisplay, ...(dark ? refDisplayDark : {}) }}>
      <a href="/scoreboard/ref" style={{ ...refBackButton, ...(dark ? refBackButtonDark : {}) }}>
        Back to Live Games
      </a>

      <div style={refTop}>
        <div>
          <div style={{ ...refField, ...(dark ? mutedTextDark : {}) }}>{field?.name || game?.field || "Field"}</div>
          <div style={{ ...refStatus, ...(dark ? refStatusDark : {}) }}>{statusLabel}</div>
        </div>
        <div style={{ ...refClock, ...(dark ? combinedTextDark : {}) }}>{clock || "0:00"}</div>
      </div>

      <div style={refTeams}>
        <RefTeamCard
          label="Home"
          team={game?.team}
          score={liveGame?.home_score}
          timeoutUsage={homeTimeouts}
          dark={dark}
        />
        <RefTeamCard
          label="Away"
          team={game?.opponent}
          score={liveGame?.away_score}
          timeoutUsage={awayTimeouts}
          dark={dark}
        />
      </div>
    </div>
  );
}

function RefTeamCard({ label, team, score, timeoutUsage, dark = false }) {
  const logo = getLogo(team);
  const remaining = Number(timeoutUsage?.remaining ?? timeoutUsage?.total ?? 0);
  const used = Number(timeoutUsage?.used || 0);

  return (
    <div style={{ ...refTeamCard, ...(dark ? refTeamCardDark : {}) }}>
      <div style={refTeamHeader}>
        <div style={{ ...refTeamLabel, ...(dark ? mutedTextDark : {}) }}>{label}</div>
        {logo && (
          <span style={dark ? refLogoPillDark : refLogoPill}>
            <img src={logo} alt="" style={refLogo} />
          </span>
        )}
      </div>
      <div style={{ ...refTeamName, ...(dark ? combinedTextDark : {}) }}>{cleanTeamName(team)}</div>
      <div style={{ ...refScore, ...(dark ? combinedTextDark : {}) }}>{Number(score || 0)}</div>
      <div style={{ ...refTimeoutLine, ...(dark ? mutedTextDark : {}) }}>
        Timeouts: <strong style={dark ? combinedTextDark : refTimeoutStrong}>{remaining}</strong> left
        <span style={refTimeoutUsed}>({used} used)</span>
      </div>
    </div>
  );
}

function BreakClockDisplay({ label, clock, game, liveGame, settings, theme = "light" }) {
  const dark = theme === "dark";
  const timeoutTeam = liveGame?.status === "timeout_home"
    ? game?.team
    : liveGame?.status === "timeout_away"
      ? game?.opponent
      : null;
  const timeoutLogo = getLogo(timeoutTeam);

  return (
    <div style={{ ...breakDisplay, ...(dark ? displayDarkSurface : {}) }}>
      <div style={{ ...breakLabel, ...(dark ? combinedTextDark : {}) }}>
        {timeoutLogo && (
          <span style={dark ? breakLogoPillDark : breakLogoPill}>
            <img src={timeoutLogo} alt="" style={breakHeaderLogo} />
          </span>
        )}
        <span>{label}</span>
      </div>
      <div style={{ ...breakClock, ...(dark ? combinedTextDark : {}) }}>{clock || "0:00"}</div>
      <div style={{ ...breakScoreLine, ...(dark ? combinedTextDark : {}) }}>
        <BreakScoreTeam team={game?.team} dark={dark} />
        <strong>{Number(liveGame?.home_score || 0)}</strong>
        <span style={{ ...breakScoreDash, ...(dark ? mutedTextDark : {}) }}>-</span>
        <strong>{Number(liveGame?.away_score || 0)}</strong>
        <BreakScoreTeam team={game?.opponent} right dark={dark} />
      </div>
    </div>
  );
}

function BreakScoreTeam({ team, right = false, dark = false }) {
  const logo = getLogo(team);

  return (
    <span style={{ ...breakScoreTeam, ...(right ? breakScoreTeamRight : {}) }}>
      {logo && (
        <span style={dark ? breakScoreLogoPillDark : breakScoreLogoPill}>
          <img src={logo} alt="" style={breakScoreLogo} />
        </span>
      )}
      <span>{cleanTeamName(team)}</span>
    </span>
  );
}

function FinalScoreDisplay({ game, liveGame, theme = "light" }) {
  const dark = theme === "dark";
  const homeScore = Number(liveGame?.home_score || 0);
  const awayScore = Number(liveGame?.away_score || 0);
  const winner = homeScore === awayScore
    ? "Tie Game"
    : `${cleanTeamName(homeScore > awayScore ? game?.team : game?.opponent)} Wins`;

  return (
    <div style={{ ...finalDisplay, ...(dark ? displayDarkSurface : {}) }}>
      <div style={finalLabel}>Final</div>
      <div style={{ ...finalWinner, ...(dark ? combinedTextDark : {}) }}>{winner}</div>
      <div style={{ ...finalTeams, ...(dark ? mutedTextDark : {}) }}>
        {cleanTeamName(game?.team)} vs {cleanTeamName(game?.opponent)}
      </div>
      <div style={{ ...finalScoreLine, ...(dark ? combinedTextDark : {}) }}>
        <span>{homeScore}</span>
        <span style={{ ...finalDash, ...(dark ? mutedTextDark : {}) }}>-</span>
        <span>{awayScore}</span>
      </div>
    </div>
  );
}

function ScoreOnlySide({ team, score, clock, timeoutUsage, opponentName, opponentScore, single = false }) {
  const logo = getLogo(team);
  return (
    <div style={single ? displaySingleSide : displaySide}>
      <div style={single ? displaySingleTop : displayTop}>
        {logo && <img src={logo} alt="" style={single ? displaySingleLogo : displayLogo} />}
        <div style={single ? displaySingleTeam : displayTeam}>{cleanTeamName(team)}</div>
      </div>
      <TimeoutDots total={timeoutUsage?.total} used={timeoutUsage?.used} display />
      <div style={single ? displaySingleScore : displayScore}>{score || 0}</div>
      <div style={single ? displaySingleClockLine : displayClockLine}>
        <span style={single ? displaySingleClock : displayClock}>{clock || "0:00"}</span>
        <span style={single ? displaySingleOpponentScore : displayOpponentScore}>
          {cleanTeamName(opponentName) || "Other"} {Number(opponentScore || 0)}
        </span>
      </div>
    </div>
  );
}

function TimeoutDots({ total = 3, used = 0, display = false, dark = false }) {
  const safeTotal = Math.max(0, Number(total || 0));
  const safeUsed = Math.max(0, Number(used || 0));

  return (
    <div style={display ? displayTimeoutDots : timeoutDots}>
      {Array.from({ length: safeTotal }).map((_, index) => (
        <span
          key={index}
          style={{
            ...(display ? displayTimeoutDot : timeoutDot),
            ...(display && dark ? displayTimeoutDotDark : {}),
            ...(index < safeUsed ? (display ? displayTimeoutDotUsed : timeoutDotUsed) : {}),
            ...(index < safeUsed && display && dark ? displayTimeoutDotUsedDark : {}),
          }}
        />
      ))}
    </div>
  );
}

function DeviceOverlay({ field, fieldId, type, onSelect, onBack, onClose }) {
  const origin = window.location.origin;
  const fieldBasePath = getCurrentFieldScoreboardBasePath(fieldId);
  const href = type === "display/ref" ? `${origin}/scoreboard/ref` : type ? `${origin}${fieldBasePath}/${type}` : "";
  const label = type === "display" ? "Combined Display" : type === "display/home" ? "Home Display iPad" : type === "display/away" ? "Away Display iPad" : type === "display/ref" ? "Ref Display" : "Add Displays";

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
            <button style={deviceChoiceBtn} onClick={() => onSelect("display")}>
              <div style={deviceChoiceTitle}>Combined Display</div>
              <div style={deviceChoiceText}>Full scoreboard view for a TV or big screen.</div>
            </button>
            <button style={deviceChoiceBtn} onClick={() => onSelect("display/home")}>
              <div style={deviceChoiceTitle}>Home Display</div>
              <div style={deviceChoiceText}>Scan for the home-side scoreboard.</div>
            </button>
            <button style={deviceChoiceBtn} onClick={() => onSelect("display/away")}>
              <div style={deviceChoiceTitle}>Away Display</div>
              <div style={deviceChoiceText}>Scan for the away-side scoreboard.</div>
            </button>
            <button style={deviceChoiceBtn} onClick={() => onSelect("display/ref")}>
              <div style={deviceChoiceTitle}>Ref Display</div>
              <div style={deviceChoiceText}>Phone list where refs can pick any live game.</div>
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

function getCurrentFieldScoreboardBasePath(fallbackFieldId) {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const currentFieldId = parts[0] === "field-scoreboard" && parts[1] ? parts[1] : fallbackFieldId;
  return `/field-scoreboard/${currentFieldId || ""}`;
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function formatAssignedRefs(refs = []) {
  const names = refs.map((ref) => ref.name).filter(Boolean);
  return names.length ? names.join(" / ") : "TBD";
}

function getLogo(team) {
  const key = cleanTeamName(team).toLowerCase();
  if (key.includes("49")) return TEAM_LOGOS["49ers"];
  return TEAM_LOGOS[key] || null;
}

function isTestGame(game) {
  return game?.source === "scoreboard-test" || game?.is_scoreboard_test;
}

function normalizeScoreboardGame(game) {
  if (!game) return game;
  if (!isTestGame(game)) return game;

  return {
    ...game,
    team: "Ravens",
    opponent: "Chiefs",
  };
}

function isTimeoutStatus(status) {
  return status === "timeout" || status === "timeout_home" || status === "timeout_away";
}

function isBreakStatus(status) {
  return status === "halftime" || isTimeoutStatus(status);
}

function getHalfKey(liveGame) {
  return String(Number(liveGame?.half || 1) >= 2 ? 2 : 1);
}

function createTimeoutState(count = 3) {
  const safeCount = Math.max(0, Number(count || 0));
  return {
    home: { 1: safeCount, 2: safeCount },
    away: { 1: safeCount, 2: safeCount },
  };
}

function createTimeoutStateWithTheme(count = 3, theme = "light") {
  return {
    ...createTimeoutState(count),
    display_theme: theme === "dark" ? "dark" : "light",
  };
}

function getTimeoutStorageKey(liveGameId) {
  return `field-scoreboard-timeouts-${liveGameId}`;
}

function loadTimeoutState(liveGameId, count, remoteState) {
  const remoteTimeouts = normalizeTimeoutState(remoteState, count);
  if (remoteState) {
    saveTimeoutState(liveGameId, remoteTimeouts);
    return remoteTimeouts;
  }

  try {
    const saved = window.localStorage.getItem(getTimeoutStorageKey(liveGameId));
    if (saved) {
      return normalizeTimeoutState(JSON.parse(saved), count);
    }
  } catch (error) {
    console.warn("Timeout state could not be loaded:", error);
  }

  return createTimeoutState(count);
}

function saveTimeoutState(liveGameId, timeouts) {
  if (!liveGameId) return;
  try {
    window.localStorage.setItem(getTimeoutStorageKey(liveGameId), JSON.stringify(timeouts));
  } catch (error) {
    console.warn("Timeout state could not be saved:", error);
  }
}

function loadSavedDisplayTheme() {
  try {
    const theme = window.localStorage.getItem(DISPLAY_THEME_STORAGE_KEY);
    return theme === "dark" ? "dark" : theme === "light" ? "light" : null;
  } catch {
    return null;
  }
}

function loadSavedFieldDisplayTheme(fieldId) {
  if (!fieldId) return null;
  try {
    const theme = window.localStorage.getItem(`${FIELD_THEME_STORAGE_PREFIX}${fieldId}`);
    return theme === "dark" ? "dark" : theme === "light" ? "light" : null;
  } catch {
    return null;
  }
}

function saveFieldDisplayThemePreference(fieldId, theme) {
  if (!fieldId) return;
  try {
    window.localStorage.setItem(`${FIELD_THEME_STORAGE_PREFIX}${fieldId}`, theme === "dark" ? "dark" : "light");
  } catch (error) {
    console.warn("Field display theme preference could not be saved:", error);
  }
}

function normalizeFieldThemes(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? value : {};
}

function normalizeTimeoutState(value, count) {
  const defaults = createTimeoutState(count);
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }

  return {
    ...defaults,
    ...(parsed || {}),
    home: { ...defaults.home, ...(parsed?.home || {}) },
    away: { ...defaults.away, ...(parsed?.away || {}) },
  };
}

function getDisplayTheme(liveGame) {
  const timeoutState = normalizeTimeoutState(liveGame?.timeout_state, DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
  return timeoutState.display_theme === "dark" ? "dark" : "light";
}

function getFieldDisplayTheme(settings, fieldId) {
  const fieldThemes = normalizeFieldThemes(settings?.scoreboard_field_themes);
  const fieldTheme = fieldThemes?.[fieldId];
  if (fieldTheme === "dark" || fieldTheme === "light") return fieldTheme;
  return settings?.scoreboard_schedule_theme === "dark" ? "dark" : "light";
}

function getActiveDisplayTheme(liveGame, settings, fieldId) {
  return liveGame ? getDisplayTheme(liveGame) : getFieldDisplayTheme(settings, fieldId);
}

function getClockAnchor(liveGame) {
  const timeoutState = normalizeTimeoutState(liveGame?.timeout_state, DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
  return timeoutState.clock_anchor || null;
}

function isClockAnchorRunning(liveGame) {
  const anchor = getClockAnchor(liveGame);
  return Boolean(anchor?.running && anchor.status === liveGame?.status);
}

function getAnchoredClockSeconds(liveGame, fallbackSeconds) {
  const anchor = getClockAnchor(liveGame);
  if (!anchor?.running || anchor.status !== liveGame?.status) return fallbackSeconds;

  const startedAt = Number(anchor.started_at || 0);
  const anchorSeconds = Number(anchor.seconds || fallbackSeconds || 0);
  if (!startedAt) return anchorSeconds;

  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return Math.max(0, anchorSeconds - elapsed);
}

function getTimeoutUsageForGame(liveGame, side, settings) {
  const total = Number(settings?.scoreboard_timeouts_per_half || DEFAULT_SETTINGS.scoreboard_timeouts_per_half);
  const halfKey = getHalfKey(liveGame);
  const timeoutState = normalizeTimeoutState(liveGame?.timeout_state, total);
  const remaining = Number(timeoutState?.[side]?.[halfKey] ?? total);

  return {
    total,
    remaining,
    used: Math.max(0, total - remaining),
  };
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

function getPeriodFormat(settings) {
  return settings?.scoreboard_period_format === "quarter" ? "quarter" : "half";
}

function getPeriodName(settings) {
  return getPeriodFormat(settings) === "quarter" ? "Quarter" : "Half";
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

function getTimeoutSeconds(settings) {
  const rawValue = Number(settings?.scoreboard_timeout_seconds || 60);
  const seconds = rawValue > 300 ? Math.round(rawValue / 60) : rawValue;
  return Math.min(300, Math.max(1, seconds));
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
const liveControlWrap = { background: "#f8fafc", boxSizing: "border-box", display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", padding: "min(14px, 1.8dvh)" };
const masterHero = { background: "#fff", borderRadius: 20, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 30, textAlign: "center" };
const masterGrid = { display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 20 };
const masterTile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", color: "#0f172a", minHeight: 136, padding: 28, textDecoration: "none" };
const masterTileTitle = { fontSize: 28, fontWeight: 900, lineHeight: 1.05 };
const masterTileSub = { color: "#64748b", fontSize: 17, fontWeight: 800, lineHeight: 1.35, marginTop: 10 };
const closedPanel = { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 18, color: "#9a3412", fontSize: 19, fontWeight: 900, marginTop: 16, padding: 24, textAlign: "center" };
const topBar = { alignItems: "center", background: "#fff", borderRadius: 18, display: "flex", justifyContent: "space-between", padding: 22, gap: 16 };
const liveTopBar = { alignItems: "center", background: "#fff", borderRadius: 16, display: "flex", flex: "0 0 auto", justifyContent: "space-between", padding: "min(12px, 1.5dvh) min(16px, 2vw)", gap: 10 };
const pageTitle = { color: "#0f172a", fontSize: 34, fontWeight: 900, lineHeight: 1.05 };
const pageSub = { color: "#64748b", fontSize: 16, fontWeight: 800, marginTop: 4 };
const displayLinks = { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" };
const themeToggleBtn = { background: "#e0f2fe", border: "2px solid transparent", borderRadius: 14, color: "#075985", cursor: "pointer", fontSize: 16, fontWeight: 900, minHeight: 48, padding: "12px 16px" };
const themeToggleActive = { background: "#111827", borderColor: "#111827", color: "#fff" };
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
const testLogoRow = { alignItems: "center", display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", marginTop: 12 };
const testTileTeam = { alignItems: "center", color: "#0f172a", display: "inline-flex", fontSize: 18, fontWeight: 900, gap: 8, minWidth: 0, whiteSpace: "nowrap" };
const testTileLogo = { flex: "0 0 auto", height: 34, objectFit: "contain", width: 34 };
const testVs = { color: "#64748b", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const gameTeams = { color: "#0f172a", fontSize: 23, fontWeight: 900, lineHeight: 1.1 };
const gameMeta = { color: "#64748b", fontSize: 16, fontWeight: 800, marginTop: 8 };
const startText = { color: "#16a34a", fontSize: 16, fontWeight: 900, marginTop: 14, textTransform: "uppercase" };
const boardPanel = { background: "#fff", borderRadius: 20, boxSizing: "border-box", display: "flex", flexDirection: "column", height: "calc(100dvh - 142px)", marginTop: 14, overflow: "hidden", padding: 18 };
const liveBoardPanel = { background: "#fff", borderRadius: 18, boxSizing: "border-box", display: "flex", flex: "1 1 auto", flexDirection: "column", marginTop: "min(10px, 1.2dvh)", minHeight: 0, overflow: "hidden", padding: "min(14px, 1.8dvh)" };
const controllerBreakBanner = { background: "#dbeafe", borderRadius: 14, color: "#1d4ed8", fontSize: "min(18px, 3dvh)", fontWeight: 900, marginBottom: 10, padding: "10px 14px", textAlign: "center" };
const controllerFinalPanel = { alignItems: "center", display: "flex", flex: 1, flexDirection: "column", justifyContent: "center", textAlign: "center" };
const controllerFinalLabel = { color: "#16a34a", fontSize: "min(44px, 7dvh)", fontWeight: 900, textTransform: "uppercase" };
const controllerFinalScore = { color: "#0f172a", fontSize: "min(140px, 24dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.85, marginTop: 14 };
const controllerFinalSub = { color: "#64748b", fontSize: "min(24px, 4dvh)", fontWeight: 900, marginTop: 18 };
const controllerFinalCloseBtn = { background: "#0f172a", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: "min(18px, 3dvh)", fontWeight: 900, marginTop: 24, padding: "14px 22px" };
const timer = { color: "#0f172a", fontSize: "min(86px, 12dvh)", fontWeight: 900, lineHeight: 0.9, textAlign: "center" };
const timerActions = { display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 10 };
const primaryBtn = { background: "#16a34a", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 17, fontWeight: 900, minHeight: 50, padding: "13px 18px" };
const secondaryBtn = { background: "#e5e7eb", border: "none", borderRadius: 14, color: "#111827", cursor: "pointer", fontSize: 17, fontWeight: 900, minHeight: 50, padding: "13px 18px" };
const hornBtn = { background: "#f59e0b", border: "none", borderRadius: 14, color: "#111827", cursor: "pointer", fontSize: 17, fontWeight: 900, minHeight: 50, padding: "13px 18px" };
const timeoutControlBtn = { background: "#fef3c7", border: "none", borderRadius: 14, color: "#92400e", cursor: "pointer", fontSize: "min(16px, 2.3dvh)", fontWeight: 900, minHeight: 50, padding: "13px 16px" };
const scoreGrid = { display: "grid", flex: 1, gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginTop: 14, minHeight: 0 };
const teamPanel = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 18, boxSizing: "border-box", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr) auto auto", minHeight: 0, padding: "min(18px, 2.4dvh)", textAlign: "center" };
const teamHeader = { alignItems: "center", display: "flex", gap: 12, justifyContent: "center", minHeight: 0 };
const logoStyle = { flex: "0 0 auto", height: "min(58px, 7.5dvh)", objectFit: "contain", width: "min(58px, 7.5dvh)" };
const teamName = { color: "#0f172a", fontSize: "min(30px, 3.8dvh)", fontWeight: 900, lineHeight: 0.95, overflowWrap: "anywhere", textAlign: "left" };
const timeoutDots = { alignItems: "center", display: "flex", gap: 8, justifyContent: "center", marginBottom: "min(8px, 1dvh)", marginTop: "min(10px, 1.3dvh)", minHeight: 14 };
const timeoutDot = { background: "#e2e8f0", border: "1px solid #cbd5e1", borderRadius: 999, display: "inline-block", height: 10, width: 34 };
const timeoutDotUsed = { background: "#111827", borderColor: "#111827" };
const scoreText = { alignSelf: "center", color: "#0f172a", fontSize: "min(132px, 22dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.72 };
const pointGrid = { display: "grid", gap: 8 };
const pointBtn = { background: "#2f6ea6", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: "min(18px, 2.4dvh)", fontWeight: 900, minHeight: "min(52px, 7dvh)", padding: "12px 10px" };
const undoGrid = { display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", marginTop: 8 };
const undoBtn = { background: "#fee2e2", border: "none", borderRadius: 12, color: "#991b1b", cursor: "pointer", fontSize: "min(16px, 2.1dvh)", fontWeight: 900, minHeight: "min(44px, 6dvh)", padding: "9px 8px" };
const displayWrap = { background: "#fff", display: "grid", height: "100dvh", inset: 0, overflow: "hidden", position: "fixed", width: "100vw", zIndex: 999 };
const displaySingleWrap = { background: "#fff", display: "grid", height: "100dvh", inset: 0, overflow: "hidden", position: "fixed", width: "100vw", zIndex: 999 };
const displayFieldCorner = { color: "#64748b", fontSize: "min(2.4vw, 2.8dvh)", fontWeight: 900, left: "1.6vw", lineHeight: 1, position: "fixed", textTransform: "uppercase", top: "1.6dvh", zIndex: 1200 };
const displayHornButton = { background: "rgba(15,23,42,0.82)", border: "none", borderRadius: 999, color: "#fff", cursor: "pointer", fontSize: "min(2.8vw, 2.8dvh)", fontWeight: 900, padding: "0.9dvh 1.4vw", position: "fixed", right: "1.5vw", top: "1.5dvh", zIndex: 1200 };
const displaySide = { alignItems: "center", borderRight: "0.7vw solid #111827", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(0, 16dvh) minmax(0, 5dvh) minmax(0, 64dvh) minmax(0, 12dvh)", height: "100dvh", justifyItems: "center", overflow: "hidden", padding: "1.4dvh 1.5vw" };
const displaySingleSide = { alignItems: "center", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(0, 16dvh) minmax(0, 5dvh) minmax(0, 65dvh) minmax(0, 11dvh)", height: "100dvh", justifyItems: "center", overflow: "hidden", padding: "1.6dvh 2vw" };
const displayTop = { alignItems: "center", display: "flex", gap: "1.4vw", justifyContent: "center", maxWidth: "46vw", minWidth: 0 };
const displaySingleTop = { alignItems: "center", display: "flex", gap: "2vw", justifyContent: "center", maxWidth: "96vw", minWidth: 0 };
const displayLogo = { height: "min(10dvh, 10vw)", maxHeight: "100%", objectFit: "contain", width: "min(10dvh, 10vw)" };
const displaySingleLogo = { height: "min(11dvh, 12vw)", maxHeight: "100%", objectFit: "contain", width: "min(11dvh, 12vw)" };
const displayTeam = { color: "#111827", fontSize: "min(4.4vw, 6.4dvh)", fontWeight: 900, lineHeight: 0.9, maxWidth: "34vw", overflowWrap: "anywhere", textAlign: "left" };
const displaySingleTeam = { color: "#111827", fontSize: "min(6.8vw, 8dvh)", fontWeight: 900, lineHeight: 0.86, maxWidth: "72vw", overflowWrap: "anywhere", textAlign: "left" };
const displayScore = { alignSelf: "center", color: "#111827", fontSize: "min(38vw, 66dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: 0, lineHeight: 0.64, maxWidth: "47vw", textAlign: "center" };
const displaySingleScore = { alignSelf: "center", color: "#111827", fontSize: "min(54vw, 74dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: 0, lineHeight: 0.6, maxWidth: "96vw", textAlign: "center" };
const displayTimeoutDots = { alignItems: "center", alignSelf: "center", display: "flex", gap: "0.75vw", justifyContent: "center", minHeight: "4dvh" };
const displayTimeoutDot = { background: "#e2e8f0", border: "0.16vw solid #cbd5e1", borderRadius: 999, display: "inline-block", height: "min(1.4vw, 2dvh)", width: "min(5.8vw, 8dvh)" };
const displayTimeoutDotUsed = { background: "#111827", borderColor: "#111827" };
const displayTimeoutDotDark = { background: "#27272a", borderColor: "#52525b" };
const displayTimeoutDotUsedDark = { background: "#fff", borderColor: "#fff" };
const displayClockLine = { alignItems: "baseline", alignSelf: "end", display: "flex", gap: "2vw", justifyContent: "center", maxWidth: "47vw", minWidth: 0 };
const displaySingleClockLine = { alignItems: "baseline", alignSelf: "end", display: "flex", gap: "3vw", justifyContent: "center", maxWidth: "96vw", minWidth: 0 };
const displayClock = { alignSelf: "end", color: "#2563eb", fontSize: "min(9vw, 11dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.92, textAlign: "center" };
const displaySingleClock = { alignSelf: "end", color: "#2563eb", fontSize: "min(13vw, 11dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.92, textAlign: "center" };
const displayOpponentScore = { color: "#64748b", fontSize: "min(7vw, 9dvh)", fontWeight: 900, lineHeight: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const displaySingleOpponentScore = { color: "#64748b", fontSize: "min(10vw, 10dvh)", fontWeight: 900, lineHeight: 0.92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const combinedDisplay = { alignItems: "stretch", background: "#fff", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(0, 20dvh) minmax(0, 1fr)", height: "100dvh", overflow: "hidden", padding: "2dvh 2.2vw", width: "100vw" };
const combinedDisplayDark = { background: "#000" };
const combinedClock = { alignSelf: "center", color: "#111827", fontSize: "min(18vw, 20dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.8, textAlign: "center" };
const combinedTextDark = { color: "#fff" };
const mutedTextDark = { color: "#d4d4d8" };
const displayDarkSurface = { background: "#000" };
const combinedTeams = { alignItems: "stretch", display: "grid", gap: 0, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", height: "100%", minHeight: 0 };
const combinedTeamPanel = { alignItems: "center", boxSizing: "border-box", display: "grid", gridTemplateRows: "minmax(0, 15dvh) minmax(0, 1fr) minmax(0, 7dvh)", justifyItems: "center", minHeight: 0, overflow: "hidden", padding: "1.8dvh 2vw" };
const combinedTeamDivider = { borderLeft: "0.22vw solid #e2e8f0" };
const combinedTeamDividerDark = { borderLeft: "0.22vw solid #3f3f46" };
const combinedTeamHeader = { alignItems: "center", display: "flex", flexWrap: "nowrap", gap: "1.2vw", justifyContent: "center", maxWidth: "100%", minWidth: 0 };
const combinedLogoPill = { alignItems: "center", display: "inline-flex", flex: "0 0 auto", justifyContent: "center" };
const combinedLogoPillDark = { ...combinedLogoPill, background: "#fff", borderRadius: 999, padding: "0.8dvh 1.2vw" };
const combinedLogo = { flex: "0 0 auto", height: "min(11dvh, 9vw)", objectFit: "contain", width: "min(11dvh, 9vw)" };
const combinedTeamName = { color: "#111827", fontSize: "min(5.6vw, 7.4dvh)", fontWeight: 900, lineHeight: 0.9, overflowWrap: "anywhere", textAlign: "center" };
const combinedScore = { alignSelf: "center", color: "#111827", fontSize: "min(34vw, 56dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, letterSpacing: 0, lineHeight: 0.66, textAlign: "center" };
const refDisplay = { background: "#f8fafc", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14, gridColumn: "1 / -1", minHeight: "100dvh", padding: "max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom))", width: "100vw" };
const refDisplayDark = { background: "#000" };
const refBackButton = { alignSelf: "flex-start", background: "#e5e7eb", borderRadius: 999, color: "#111827", fontSize: 14, fontWeight: 900, padding: "10px 14px", textDecoration: "none" };
const refBackButtonDark = { background: "#18181b", color: "#fff" };
const refTop = { alignItems: "center", display: "flex", flexDirection: "column", gap: 10, textAlign: "center" };
const refField = { color: "#64748b", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const refStatus = { background: "#dcfce7", borderRadius: 999, color: "#166534", display: "inline-flex", fontSize: 14, fontWeight: 900, marginTop: 6, padding: "6px 10px", textTransform: "uppercase" };
const refStatusDark = { background: "#18181b", color: "#fff" };
const refClock = { color: "#111827", fontSize: "clamp(64px, 24vw, 128px)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.86, textAlign: "center", width: "100%" };
const refTeams = { display: "grid", gap: 12, flex: 1 };
const refTeamCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxSizing: "border-box", display: "grid", gridTemplateRows: "auto auto minmax(0, 1fr) auto", minHeight: 0, padding: 16 };
const refTeamCardDark = { background: "#09090b", borderColor: "#27272a" };
const refTeamHeader = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 10 };
const refTeamLabel = { color: "#64748b", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const refLogoPill = { alignItems: "center", display: "inline-flex", flex: "0 0 auto", justifyContent: "center" };
const refLogoPillDark = { ...refLogoPill, background: "#fff", borderRadius: 999, padding: "6px 10px" };
const refLogo = { height: 42, objectFit: "contain", width: 42 };
const refTeamName = { color: "#111827", fontSize: "clamp(26px, 8vw, 48px)", fontWeight: 900, lineHeight: 0.95, marginTop: 10, overflowWrap: "anywhere" };
const refScore = { alignSelf: "center", color: "#111827", fontSize: "clamp(96px, 34vw, 190px)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.72, textAlign: "center" };
const refTimeoutLine = { color: "#64748b", fontSize: "clamp(18px, 5vw, 28px)", fontWeight: 900, lineHeight: 1.1 };
const refTimeoutStrong = { color: "#111827" };
const refTimeoutUsed = { marginLeft: 8 };
const displayEmpty = { alignItems: "center", color: "#111827", display: "flex", flexDirection: "column", fontSize: "clamp(44px, 7vw, 112px)", fontWeight: 900, gridColumn: "1 / -1", height: "100dvh", justifyContent: "center", padding: "4dvh 4vw", textAlign: "center" };
const displayIdleTitle = { fontSize: "clamp(72px, 12vw, 180px)", fontWeight: 900, lineHeight: 0.95 };
const displayIdleSub = { color: "#64748b", fontSize: "clamp(34px, 5vw, 78px)", marginTop: "3vh" };
const displaySchedule = { alignItems: "center", boxSizing: "border-box", display: "flex", flexDirection: "column", gridColumn: "1 / -1", height: "100dvh", justifyContent: "flex-start", overflow: "hidden", padding: "2dvh 3vw" };
const displayFieldName = { color: "#111827", fontSize: "min(10vw, 12dvh)", fontWeight: 900, lineHeight: 0.9, textAlign: "center" };
const displayWeekLabel = { color: "#2f6ea6", fontSize: "min(4.8vw, 6dvh)", fontWeight: 900, marginTop: "1dvh", textTransform: "uppercase" };
const displayGameList = { display: "grid", gap: "1dvh", marginTop: "1.6dvh", maxHeight: "72dvh", maxWidth: "94vw", overflow: "hidden", width: "100%" };
const displayGameRow = { alignItems: "center", border: "0.35vw solid #111827", borderRadius: "1.2vw", boxSizing: "border-box", display: "grid", gap: "1.5vw", gridTemplateColumns: "14vw 1fr 24vw", minHeight: "8.8dvh", padding: "0.85dvh 1.5vw" };
const displayGameRowDark = { borderColor: "#3f3f46" };
const displayGameTime = { color: "#111827", fontSize: "min(4.8vw, 7dvh)", fontWeight: 900, lineHeight: 0.95 };
const displayGameMain = { display: "grid", gap: "0.7dvh", minWidth: 0 };
const displayGameTeamsRow = { alignItems: "center", color: "#111827", display: "grid", fontSize: "min(3.8vw, 5.3dvh)", fontWeight: 900, gap: "0.9vw", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", lineHeight: 0.95, minWidth: 0 };
const displayScheduleTeam = { alignItems: "center", display: "inline-flex", gap: "0.55vw", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap" };
const displayScheduleLogoPill = { alignItems: "center", display: "inline-flex", flex: "0 0 auto", justifyContent: "center" };
const displayScheduleLogoPillDark = { ...displayScheduleLogoPill, background: "#fff", borderRadius: 999, padding: "0.35dvh 0.5vw" };
const displayScheduleLogo = { flex: "0 0 auto", height: "min(4.4dvh, 3.4vw)", objectFit: "contain", width: "min(4.4dvh, 3.4vw)" };
const displayGameVs = { color: "#64748b", fontSize: "min(2.3vw, 3.1dvh)", fontWeight: 900, textTransform: "uppercase" };
const displayGameRefs = { color: "#111827", fontSize: "min(2.6vw, 3.5dvh)", fontWeight: 900, lineHeight: 1, overflowWrap: "anywhere" };
const displayGameMetaBlock = { display: "grid", gap: "0.6dvh", minWidth: 0, textAlign: "right" };
const displayGameDivision = { color: "#111827", fontSize: "min(3.4vw, 4.8dvh)", fontWeight: 900, lineHeight: 1 };
const displayGameField = { color: "#475569", fontSize: "min(2.8vw, 3.8dvh)", fontWeight: 900, lineHeight: 1 };
const displayNoGames = { color: "#64748b", fontSize: "clamp(44px, 7vw, 108px)", fontWeight: 900, textAlign: "center" };
const breakDisplay = { alignItems: "center", background: "#fff", boxSizing: "border-box", display: "flex", flexDirection: "column", gridColumn: "1 / -1", height: "100dvh", justifyContent: "center", padding: "4dvh 4vw", width: "100vw" };
const breakHeaderLogo = { flex: "0 0 auto", height: "0.85em", objectFit: "contain", width: "0.85em" };
const breakLogoPill = { alignItems: "center", display: "inline-flex", flex: "0 0 auto", justifyContent: "center" };
const breakLogoPillDark = { ...breakLogoPill, background: "#fff", borderRadius: 999, padding: "0.13em 0.2em" };
const breakLabel = { alignItems: "center", color: "#111827", display: "flex", fontSize: "clamp(34px, min(10vw, 13dvh), 150px)", fontWeight: 900, gap: "1.4vw", justifyContent: "center", lineHeight: 0.9, maxWidth: "96vw", overflow: "hidden", textAlign: "center", textOverflow: "ellipsis", textTransform: "uppercase", whiteSpace: "nowrap" };
const breakClock = { color: "#111827", fontSize: "min(42vw, 48dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.8, marginTop: "4dvh" };
const breakScoreLine = { alignItems: "center", color: "#111827", display: "flex", flexWrap: "wrap", fontSize: "min(7vw, 8dvh)", fontWeight: 900, gap: "1.8vw", justifyContent: "center", lineHeight: 0.9, marginTop: "4dvh", textAlign: "center" };
const breakScoreTeam = { alignItems: "center", display: "inline-flex", gap: "1vw", whiteSpace: "nowrap" };
const breakScoreTeamRight = { flexDirection: "row-reverse" };
const breakScoreLogoPill = { alignItems: "center", display: "inline-flex", flex: "0 0 auto", justifyContent: "center" };
const breakScoreLogoPillDark = { ...breakScoreLogoPill, background: "#fff", borderRadius: 999, padding: "0.5dvh 0.75vw" };
const breakScoreLogo = { height: "min(8dvh, 7vw)", objectFit: "contain", width: "min(8dvh, 7vw)" };
const breakScoreDash = { color: "#94a3b8" };
const finalDisplay = { alignItems: "center", background: "#fff", boxSizing: "border-box", display: "flex", flexDirection: "column", gridColumn: "1 / -1", height: "100dvh", justifyContent: "center", overflow: "hidden", padding: "3dvh 4vw", textAlign: "center", width: "100vw" };
const finalLabel = { color: "#16a34a", fontSize: "min(12vw, 15dvh)", fontWeight: 900, lineHeight: 0.86, textTransform: "uppercase" };
const finalWinner = { color: "#111827", fontSize: "min(9vw, 11dvh)", fontWeight: 900, lineHeight: 0.9, marginTop: "2dvh", overflowWrap: "anywhere" };
const finalTeams = { color: "#64748b", fontSize: "min(4.4vw, 5.4dvh)", fontWeight: 900, lineHeight: 1, marginTop: "1.6dvh", overflowWrap: "anywhere" };
const finalScoreLine = { alignItems: "center", color: "#111827", display: "flex", fontSize: "min(30vw, 36dvh)", fontVariantNumeric: "tabular-nums", fontWeight: 900, gap: "3vw", lineHeight: 0.72, marginTop: "2.5dvh" };
const finalDash = { color: "#94a3b8", fontSize: "min(12vw, 14dvh)" };
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
const clockEditorOverlay = { alignItems: "center", background: "rgba(15,23,42,0.82)", boxSizing: "border-box", display: "flex", inset: 0, justifyContent: "center", padding: 18, position: "fixed", zIndex: 2100 };
const clockEditorPanel = { background: "#fff", borderRadius: 22, boxSizing: "border-box", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", maxWidth: 620, padding: "min(22px, 3vw)", width: "min(620px, 94vw)" };
const clockEditorHeader = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 16 };
const clockEditorTitle = { color: "#0f172a", fontSize: 34, fontWeight: 900, marginTop: 2 };
const clockEditorTime = { alignItems: "end", display: "grid", gap: "min(12px, 2vw)", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", marginTop: 22 };
const clockEditorField = { display: "grid", gap: 8, minWidth: 0 };
const clockEditorLabel = { color: "#64748b", fontSize: 14, fontWeight: 900, textTransform: "uppercase" };
const clockEditorInput = { background: "#f8fafc", border: "2px solid #cbd5e1", borderRadius: 16, boxSizing: "border-box", color: "#0f172a", fontSize: "clamp(38px, 9vw, 58px)", fontVariantNumeric: "tabular-nums", fontWeight: 900, minWidth: 0, padding: "12px 8px", textAlign: "center", width: "100%" };
const clockEditorColon = { color: "#0f172a", fontSize: "clamp(38px, 9vw, 58px)", fontWeight: 900, lineHeight: 1, paddingBottom: 12 };
const clockEditorSaveBtn = { background: "#16a34a", border: "none", borderRadius: 16, color: "#fff", cursor: "pointer", fontSize: 22, fontWeight: 900, marginTop: 18, minHeight: 58, width: "100%" };
