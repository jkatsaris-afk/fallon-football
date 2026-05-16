import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../../supabase";
import { applyUuidSeasonFilter, getActiveSeason } from "../../../utils/season";

const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];

export default function LiveScoreboardPage() {
  const [fields, setFields] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showParentSign, setShowParentSign] = useState(false);
  const [view, setView] = useState("overview");
  const [championshipGames, setChampionshipGames] = useState([]);
  const [championshipScores, setChampionshipScores] = useState([]);
  const [championshipDivision, setChampionshipDivision] = useState("all");

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadLiveGames();
      loadChampionshipBracket();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const { data: fieldData } = await supabase
      .from("fields")
      .select("*")
      .eq("is_active", true)
      .order("field_number", { ascending: true });

    setFields(groupPhysicalFields(fieldData || []));
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setSettings(settingsData || {});
    await loadLiveGames();
    await loadChampionshipBracket();
  };

  const loadLiveGames = async () => {
    const { data, error } = await supabase
      .from("games_live")
      .select("*")
      .in("status", LIVE_GAME_STATUSES)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Live games load failed:", error);
      setLiveGames([]);
      return;
    }

    const scheduleIds = [...new Set((data || []).map((game) => game.schedule_id).filter(Boolean))];
    if (!scheduleIds.length) {
      setLiveGames(data || []);
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

    setLiveGames((data || []).map((game) => ({
      ...game,
      schedule_master_auto: scheduleById[game.schedule_id],
    })));
  };

  const loadChampionshipBracket = async () => {
    const active = await getActiveSeason();
    const { data: scheduleRows, error } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%champ%")
      .order("division", { ascending: true })
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true }), active);

    if (error) {
      console.error("Championship bracket load failed:", error);
      setChampionshipGames([]);
      setChampionshipScores([]);
      return;
    }

    const scheduleIds = (scheduleRows || []).map((game) => game.id).filter(Boolean);
    const { data: scores } = scheduleIds.length
      ? await supabase.from("game_scores").select("*").in("schedule_id", scheduleIds)
      : { data: [] };

    setChampionshipGames(scheduleRows || []);
    setChampionshipScores(dedupeScoresByScheduleId(scores || []));
  };

  const updateSetting = async (field, value) => {
    const { error } = await supabase.from("app_settings").update({ [field]: value }).eq("id", 1);
    if (error) {
      console.error("Live scoreboard setting update failed:", error);
      return;
    }

    setSettings((current) => ({ ...current, [field]: value }));
  };

  const closeGame = async (game) => {
    await supabase.from("games_live").update({ status: "closed" }).eq("id", game.id);
    loadLiveGames();
  };

  const getFieldLiveGame = (field) => (
    liveGames.find((game) => (
      (field.scoreboard_field_ids || [field.id]).includes(game.schedule_master_auto?.field_id)
    ))
  );

  const origin = window.location.origin;
  const scoreboardsOpen = settings?.live_scoreboards_open !== false;
  const masterIpadLink = `${origin}/scoreboard-master`;
  const publicScoreboardLink = `${origin}/scoreboard/live`;
  const championshipDivisions = useMemo(() => (
    ["all", ...new Set(championshipGames.map((game) => normalizeDivision(game.division)).filter(Boolean))]
  ), [championshipGames]);
  const scoreByScheduleId = useMemo(() => {
    const map = {};
    championshipScores.forEach((score) => {
      map[score.schedule_id] = score;
    });
    return map;
  }, [championshipScores]);
  const bracketGroups = useMemo(() => (
    buildChampionshipBracketGroups(championshipGames, scoreByScheduleId, championshipDivision)
  ), [championshipDivision, championshipGames, scoreByScheduleId]);

  const printParentSign = () => {
    setShowParentSign(true);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div style={wrap}>
      <div>
        <h2 style={title}>Scoreboard</h2>
        <div style={subtitle}>
          Set up field controllers, live displays, parent score links, and the live scoreboard defaults.
        </div>
      </div>

      <div style={tileGrid}>
        <ManagerTile
          title="Overview"
          desc={`${liveGames.length} live boards running`}
          active={view === "overview"}
          onClick={() => setView("overview")}
        />
        <ManagerTile
          title="Settings"
          desc="Clock, period, timeout, and scoring defaults"
          active={view === "settings"}
          onClick={() => setView("settings")}
        />
        <ManagerTile
          title="Devices"
          desc={`${fields.length} field controller groups`}
          active={view === "devices"}
          onClick={() => setView("devices")}
        />
        <ManagerTile
          title="Live Championship Brackets"
          desc={`${championshipGames.length} scheduled championship games`}
          active={view === "brackets"}
          onClick={() => setView("brackets")}
        />
      </div>

      {view === "overview" && (
        <>
          <div style={overviewPanel}>
            <div>
              <div style={settingsTitle}>Live Scoreboard Control</div>
              <div style={settingsHint}>
                One switch controls every field controller and display link. Devices show "Live scoreboard is turned off" when this is off.
              </div>
            </div>
            <button
              type="button"
              style={{ ...toggleButton, ...(scoreboardsOpen ? toggleOn : toggleOff) }}
              onClick={() => updateSetting("live_scoreboards_open", !scoreboardsOpen)}
            >
              {scoreboardsOpen ? "All Boards On" : "All Boards Off"}
            </button>
          </div>

          <div style={topQrGrid}>
            <div style={masterPanel}>
              <div>
                <div style={settingsTitle}>Master iPad</div>
                <div style={settingsHint}>Scan this first to monitor every field and add controller/display iPads from one screen.</div>
                <a href={masterIpadLink} target="_blank" rel="noreferrer" style={masterLink}>
                  Open Master Scoreboard
                </a>
              </div>
              <div style={masterQrFrame}>
                <QRCodeSVG value={masterIpadLink} size={150} level="M" includeMargin />
              </div>
            </div>

            <div style={masterPanel}>
              <div>
                <div style={settingsTitle}>Parent Live Scores</div>
                <div style={settingsHint}>Print this sign for tents so parents can scan directly into the public live scores page.</div>
                <a href={publicScoreboardLink} target="_blank" rel="noreferrer" style={masterLink}>
                  Open Live Scores
                </a>
                <button type="button" style={printSignBtn} onClick={printParentSign}>
                  Print / Save PDF Sign
                </button>
              </div>
              <div style={masterQrFrame}>
                <QRCodeSVG key={publicScoreboardLink} value={publicScoreboardLink} size={150} level="M" includeMargin />
              </div>
            </div>
          </div>

          <div style={liveSummaryGrid}>
            {fields.map((field) => {
              const liveGame = getFieldLiveGame(field);
              return (
                <div key={field.id} style={summaryCard}>
                  <div style={summaryTop}>
                    <div>
                      <div style={fieldName}>{field.name}</div>
                      <div style={fieldMeta}>Field {field.field_number || "-"} - {field.type}</div>
                    </div>
                    <div style={{ ...statusBadge, ...(liveGame ? liveBadge : idleBadge) }}>
                      {!scoreboardsOpen ? "Off" : liveGame ? "Live" : "Idle"}
                    </div>
                  </div>
                  {liveGame ? (
                    <div style={summaryGame}>
                      <strong>{liveGame.schedule_master_auto?.team || "Home"}</strong>
                      <span>{liveGame.home_score} - {liveGame.away_score}</span>
                      <strong>{liveGame.schedule_master_auto?.opponent || "Away"}</strong>
                      <span>{liveGame.clock}</span>
                    </div>
                  ) : (
                    <div style={settingsHint}>No live game on this field right now.</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "settings" && (
        <div style={settingsPanel}>
          <div style={toggleRow}>
            <div>
              <div style={settingsTitle}>Live Scoreboards</div>
              <div style={settingsHint}>One switch controls every field master, controller, and display link.</div>
            </div>
            <button
              type="button"
              style={{ ...toggleButton, ...(scoreboardsOpen ? toggleOn : toggleOff) }}
              onClick={() => updateSetting("live_scoreboards_open", !scoreboardsOpen)}
            >
              {scoreboardsOpen ? "On" : "Off"}
            </button>
          </div>

          <div style={settingsDivider} />

          <div style={settingsTitle}>Live Scoreboard Defaults</div>
          <PeriodFormatToggle
            value={settings?.scoreboard_period_format || "half"}
            onChange={(value) => updateSetting("scoreboard_period_format", value)}
          />
          <div style={settingsGrid}>
            <SettingInput label={getPeriodLengthLabel(settings)} suffix="min" value={settings?.scoreboard_game_minutes || 24} onChange={(value) => updateSetting("scoreboard_game_minutes", value)} />
            <SettingInput label="Halftime" suffix="min" value={settings?.scoreboard_halftime_minutes || 5} onChange={(value) => updateSetting("scoreboard_halftime_minutes", value)} />
            <SettingInput label="Timeout" suffix="sec" value={getTimeoutSettingValue(settings)} onChange={(value) => updateSetting("scoreboard_timeout_seconds", value)} />
            <SettingInput label="Timeouts" suffix="/half" value={settings?.scoreboard_timeouts_per_half || 3} onChange={(value) => updateSetting("scoreboard_timeouts_per_half", value)} />
            <SettingInput label="Touchdown" suffix="pts" value={settings?.scoreboard_touchdown_points || 6} onChange={(value) => updateSetting("scoreboard_touchdown_points", value)} />
            <SettingInput label="Extra 1" suffix="pt" value={settings?.scoreboard_extra_one_points || 1} onChange={(value) => updateSetting("scoreboard_extra_one_points", value)} />
            <SettingInput label="Extra 2" suffix="pts" value={settings?.scoreboard_extra_two_points || 2} onChange={(value) => updateSetting("scoreboard_extra_two_points", value)} />
          </div>
        </div>
      )}

      {view === "devices" && (
        <div style={fieldGrid}>
        {fields.map((field) => {
          const liveGame = getFieldLiveGame(field);
          const masterLink = `${origin}/field-scoreboard/${field.id}`;
          const controllerLink = `${origin}/field-scoreboard/${field.id}/control`;
          const combinedDisplayLink = `${origin}/field-scoreboard/${field.id}/display`;
          const homeDisplayLink = `${origin}/field-scoreboard/${field.id}/display/home`;
          const awayDisplayLink = `${origin}/field-scoreboard/${field.id}/display/away`;
          const hasChampionship = field.scoreboard_phases.includes("championship");
          const hasRegular = field.scoreboard_phases.includes("regular");

          return (
            <div key={field.id} style={fieldCard}>
              <div style={fieldHeader}>
                <div>
                  <div style={fieldName}>{field.name}</div>
                  <div style={fieldMeta}>Field {field.field_number || "-"} - {field.type}</div>
                  <div style={phaseRow}>
                    {hasRegular && <span style={regularPill}>Regular Season</span>}
                    {hasChampionship && <span style={champPill}>Championship Setup</span>}
                  </div>
                </div>
                <div style={{ ...statusBadge, ...(liveGame ? liveBadge : idleBadge) }}>
                  {!scoreboardsOpen ? "Off" : liveGame ? "Live" : "Idle"}
                </div>
              </div>

              {liveGame && (
                <div style={liveBox}>
                  <div style={liveTitle}>
                    {liveGame.schedule_master_auto?.team} vs {liveGame.schedule_master_auto?.opponent}
                  </div>
                  <div style={liveScore}>
                    {liveGame.home_score} - {liveGame.away_score} - {liveGame.clock}
                  </div>
                  <button style={closeBtn} onClick={() => closeGame(liveGame)}>
                    Close Live Game
                  </button>
                </div>
              )}

              <div style={qrGrid}>
                <QrBox label="Controller iPad" href={controllerLink} />
                <QrBox label="Combined Display" href={combinedDisplayLink} />
                <QrBox label="Home Display" href={homeDisplayLink} />
                <QrBox label="Away Display" href={awayDisplayLink} />
              </div>

              <LinkBox label="Field Master Link" href={masterLink} />
            </div>
          );
        })}
        </div>
      )}

      {view === "brackets" && (
        <div style={bracketPanel}>
          <div style={bracketHeader}>
            <div>
              <div style={settingsTitle}>Live Championship Brackets</div>
              <div style={settingsHint}>Updates from championship schedule rows and final scores.</div>
            </div>
            <div style={divisionFilterRow}>
              {championshipDivisions.map((division) => (
                <button
                  key={division}
                  type="button"
                  style={{
                    ...divisionFilterBtn,
                    ...(championshipDivision === division ? divisionFilterActive : {}),
                  }}
                  onClick={() => setChampionshipDivision(division)}
                >
                  {division === "all" ? "All Divisions" : division}
                </button>
              ))}
            </div>
          </div>

          {!championshipGames.length && (
            <div style={emptyBracket}>No championship games have been scheduled yet.</div>
          )}

          {bracketGroups.map((group) => (
            <section key={group.division} style={bracketDivision}>
              <div style={bracketDivisionTitle}>{group.division}</div>
              <div style={bracketGrid}>
                {group.games.map((game) => (
                  <ChampionshipBracketCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            #parent-scoreboard-sign, #parent-scoreboard-sign * { visibility: visible !important; }
            #parent-scoreboard-sign { position: fixed !important; inset: 0 !important; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {showParentSign && (
        <ParentScoreboardSign
          href={publicScoreboardLink}
          onClose={() => setShowParentSign(false)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}

function ParentScoreboardSign({ href, onClose, onPrint }) {
  return (
    <div id="parent-scoreboard-sign" style={signOverlay}>
      <div style={signPage}>
        <div className="no-print" style={signActions}>
          <button type="button" style={signActionBtn} onClick={onPrint}>Print / Save PDF</button>
          <button type="button" style={signCloseBtn} onClick={onClose}>Close</button>
        </div>
        <div style={signEyebrow}>Fallon Football</div>
        <div style={signTitle}>Live Scores</div>
        <div style={signSubtitle}>Scan to follow live games, current scores, and final results.</div>
        <div style={signQrFrame}>
          <QRCodeSVG key={href} value={href} size={330} level="H" includeMargin />
        </div>
        <div style={signUrl}>{href}</div>
      </div>
    </div>
  );
}

function PeriodFormatToggle({ value, onChange }) {
  const format = value === "quarter" ? "quarter" : "half";

  return (
    <div style={formatToggleWrap}>
      <span style={settingLabel}>Format</span>
      <div style={formatToggle}>
        <button
          type="button"
          style={{ ...formatBtn, ...(format === "half" ? formatBtnActive : {}) }}
          onClick={() => onChange("half")}
        >
          Half
        </button>
        <button
          type="button"
          style={{ ...formatBtn, ...(format === "quarter" ? formatBtnActive : {}) }}
          onClick={() => onChange("quarter")}
        >
          Quarter
        </button>
      </div>
    </div>
  );
}

function SettingInput({ label, suffix, value, onChange }) {
  const [draft, setDraft] = useState(String(value ?? ""));

  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);

  const commit = () => {
    const next = Number(draft);
    if (draft !== "" && Number.isFinite(next)) {
      onChange(next);
      return;
    }

    setDraft(String(value ?? ""));
  };

  return (
    <label style={settingField}>
      <span style={settingLabel}>{label}</span>
      <div style={settingInputWrap}>
        <input
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          style={settingInput}
        />
        <span style={settingSuffix}>{suffix}</span>
      </div>
    </label>
  );
}

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

function getPeriodLengthLabel(settings) {
  return settings?.scoreboard_period_format === "quarter" ? "Quarter Length" : "Half Length";
}

function getTimeoutSettingValue(settings) {
  const rawValue = Number(settings?.scoreboard_timeout_seconds || 60);
  return rawValue > 300 ? Math.round(rawValue / 60) : rawValue;
}

function QrBox({ label, href }) {
  return (
    <div style={qrBox}>
      <div style={qrTitle}>{label}</div>
      <div style={qrFrame}>
        <QRCodeSVG value={href} size={132} level="M" includeMargin />
      </div>
      <a href={href} target="_blank" rel="noreferrer" style={qrLink}>
        Open Link
      </a>
    </div>
  );
}

function LinkBox({ label, href }) {
  return (
    <div style={linkBox}>
      <div style={linkLabel}>{label}</div>
      <a href={href} target="_blank" rel="noreferrer" style={linkText}>
        {href}
      </a>
    </div>
  );
}

function ChampionshipBracketCard({ game }) {
  const score = game.score;
  const hasScore = !!score;
  const homeScore = Number(score?.home_score || 0);
  const awayScore = Number(score?.away_score || 0);
  const winner = hasScore && homeScore !== awayScore
    ? homeScore > awayScore ? game.team : game.opponent
    : "";

  return (
    <article style={bracketCard}>
      <div style={bracketCardTop}>
        <div>
          <div style={bracketGameNumber}>Game {game.gameNumber || "-"}</div>
          <div style={bracketMeta}>
            {formatBracketDate(game.event_date)} • {game.event_time || game.time || "Time TBD"} • {game.field || "Field TBD"}
          </div>
        </div>
        <span style={{ ...bracketStatus, ...(hasScore ? bracketStatusFinal : bracketStatusScheduled) }}>
          {hasScore ? "Final" : "Scheduled"}
        </span>
      </div>

      <BracketTeamLine
        name={game.team || "Team TBD"}
        score={hasScore ? homeScore : null}
        winner={winner && winner === game.team}
      />
      <BracketTeamLine
        name={game.opponent || "Opponent TBD"}
        score={hasScore ? awayScore : null}
        winner={winner && winner === game.opponent}
      />

      {winner && (
        <div style={winnerLine}>Winner: {winner}</div>
      )}
    </article>
  );
}

function BracketTeamLine({ name, score, winner }) {
  return (
    <div style={{ ...bracketTeamLine, ...(winner ? bracketTeamWinner : {}) }}>
      <span style={bracketTeamName}>{name}</span>
      <span style={bracketTeamScore}>{score === null ? "-" : score}</span>
    </div>
  );
}

function groupPhysicalFields(fields) {
  const grouped = new Map();

  fields.forEach((field) => {
    const phase = field.season_phase || "regular";
    const key = [
      cleanKey(field.name),
      field.field_number || "",
      cleanKey(field.type),
    ].join("|");

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        ...field,
        scoreboard_field_ids: [field.id],
        scoreboard_phases: [phase],
      });
      return;
    }

    existing.scoreboard_field_ids.push(field.id);
    if (!existing.scoreboard_phases.includes(phase)) {
      existing.scoreboard_phases.push(phase);
    }

    if ((existing.season_phase || "regular") !== "regular" && phase === "regular") {
      grouped.set(key, {
        ...field,
        scoreboard_field_ids: existing.scoreboard_field_ids,
        scoreboard_phases: existing.scoreboard_phases,
      });
    }
  });

  return [...grouped.values()].sort((a, b) => Number(a.field_number || 0) - Number(b.field_number || 0));
}

function cleanKey(value) {
  return (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function buildChampionshipBracketGroups(games, scoreByScheduleId, selectedDivision) {
  const groups = {};

  games.forEach((game) => {
    const division = normalizeDivision(game.division);
    if (selectedDivision !== "all" && division !== selectedDivision) return;
    if (!groups[division]) groups[division] = [];
    groups[division].push({
      ...game,
      gameNumber: getChampionshipGameNumber(game),
      score: scoreByScheduleId[game.id],
    });
  });

  return Object.entries(groups)
    .sort(([a], [b]) => sortDivisions(a, b))
    .map(([division, divisionGames]) => ({
      division,
      games: divisionGames.sort((a, b) => (
        Number(a.gameNumber || 999) - Number(b.gameNumber || 999) ||
        String(a.event_date || "").localeCompare(String(b.event_date || "")) ||
        timeToMinutes(a.event_time || a.time) - timeToMinutes(b.event_time || b.time)
      )),
    }));
}

function getChampionshipGameNumber(game) {
  const sourceMatch = String(game?.source || "").match(/game:(\d+)/i);
  return sourceMatch ? Number(sourceMatch[1]) : null;
}

function dedupeScoresByScheduleId(scores) {
  const byScheduleId = new Map();

  scores.forEach((score) => {
    if (!score.schedule_id) return;
    const existing = byScheduleId.get(score.schedule_id);
    if (!existing || new Date(score.created_at || 0) > new Date(existing.created_at || 0)) {
      byScheduleId.set(score.schedule_id, score);
    }
  });

  return [...byScheduleId.values()];
}

function normalizeDivision(value) {
  const division = (value || "").toString().trim();
  return division || "Unassigned";
}

function sortDivisions(a, b) {
  const order = ["K-1", "K-1st", "2nd-3rd", "4th-5th", "6th-8th", "Unassigned"];
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);
  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
  }
  return String(a || "").localeCompare(String(b || ""));
}

function timeToMinutes(value) {
  if (!value) return 0;
  const text = value.toString().trim().toUpperCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return 0;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function formatBracketDate(value) {
  if (!value) return "Date TBD";
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const wrap = { display: "flex", flexDirection: "column", gap: 18 };
const title = { color: "#0f172a", fontSize: 24, fontWeight: 900, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 14, marginTop: 4 };
const tileGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" };
const tile = { background: "#fff", border: "none", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", cursor: "pointer", minHeight: 96, padding: 16, textAlign: "left" };
const activeTile = { outline: "2px solid #16a34a", boxShadow: "0 10px 28px rgba(22,163,74,0.16)" };
const tileTitle = { color: "#0f172a", fontSize: 16, fontWeight: 900 };
const tileDesc = { color: "#64748b", fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 6 };
const topQrGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" };
const overviewPanel = { alignItems: "center", background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", display: "flex", justifyContent: "space-between", gap: 16, padding: 16 };
const masterPanel = { alignItems: "center", background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", display: "flex", justifyContent: "space-between", gap: 16, padding: 16 };
const masterLink = { color: "#2563eb", display: "inline-block", fontSize: 13, fontWeight: 900, marginTop: 10, textDecoration: "none" };
const printSignBtn = { background: "#16a34a", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", display: "block", fontSize: 13, fontWeight: 900, marginTop: 10, padding: "9px 11px" };
const masterQrFrame = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, display: "flex", flex: "0 0 auto", padding: 8 };
const settingsPanel = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 16 };
const settingsTitle = { color: "#0f172a", fontSize: 16, fontWeight: 900 };
const settingsHint = { color: "#64748b", fontSize: 13, marginTop: 4 };
const toggleRow = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 16 };
const toggleButton = { border: "none", borderRadius: 999, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 900, minWidth: 84, padding: "10px 16px" };
const toggleOn = { background: "#16a34a" };
const toggleOff = { background: "#dc2626" };
const settingsDivider = { background: "#e2e8f0", height: 1, margin: "16px 0" };
const settingsGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" };
const liveSummaryGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" };
const summaryCard = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 16 };
const summaryTop = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 };
const summaryGame = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, color: "#0f172a", display: "grid", gap: 8, gridTemplateColumns: "1fr auto 1fr auto", padding: 12 };
const formatToggleWrap = { display: "grid", gap: 8, margin: "12px 0 14px" };
const formatToggle = { background: "#e2e8f0", borderRadius: 14, display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr", maxWidth: 360, padding: 4 };
const formatBtn = { background: "transparent", border: "none", borderRadius: 11, color: "#475569", cursor: "pointer", fontSize: 15, fontWeight: 900, padding: "11px 14px" };
const formatBtnActive = { background: "#fff", boxShadow: "0 2px 8px rgba(15,23,42,0.12)", color: "#0f172a" };
const settingField = { display: "flex", flexDirection: "column", gap: 5 };
const settingLabel = { color: "#475569", fontSize: 11, fontWeight: 900, textTransform: "uppercase" };
const settingInputWrap = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, display: "flex", overflow: "hidden" };
const settingInput = { background: "transparent", border: "none", flex: 1, fontWeight: 800, minWidth: 0, padding: 10, width: "100%" };
const settingSuffix = { color: "#64748b", fontSize: 12, fontWeight: 800, paddingRight: 10 };
const fieldGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" };
const fieldCard = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 16 };
const fieldHeader = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 10 };
const fieldName = { color: "#0f172a", fontSize: 18, fontWeight: 900 };
const fieldMeta = { color: "#64748b", fontSize: 12, marginTop: 2 };
const phaseRow = { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 };
const regularPill = { background: "#e0f2fe", borderRadius: 999, color: "#075985", fontSize: 11, fontWeight: 900, padding: "4px 8px" };
const champPill = { background: "#fef3c7", borderRadius: 999, color: "#92400e", fontSize: 11, fontWeight: 900, padding: "4px 8px" };
const statusBadge = { borderRadius: 999, fontSize: 12, fontWeight: 900, padding: "5px 9px" };
const liveBadge = { background: "#dcfce7", color: "#166534" };
const idleBadge = { background: "#e5e7eb", color: "#475569" };
const liveBox = { background: "#f8fafc", borderRadius: 12, marginTop: 12, padding: 12 };
const liveTitle = { color: "#0f172a", fontWeight: 900 };
const liveScore = { color: "#64748b", fontSize: 13, marginTop: 4 };
const closeBtn = { background: "#dc2626", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 900, marginTop: 10, padding: "8px 10px" };
const qrGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", marginTop: 14 };
const qrBox = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8, padding: 10, textAlign: "center" };
const qrTitle = { color: "#0f172a", fontSize: 12, fontWeight: 900 };
const qrFrame = { background: "#fff", borderRadius: 8, display: "flex", padding: 6 };
const qrLink = { color: "#2563eb", fontSize: 12, fontWeight: 900, textDecoration: "none" };
const linkBox = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, marginTop: 12, padding: 10 };
const linkLabel = { color: "#475569", fontSize: 11, fontWeight: 900, textTransform: "uppercase" };
const linkText = { color: "#2563eb", display: "block", fontSize: 12, fontWeight: 800, marginTop: 4, overflowWrap: "anywhere", textDecoration: "none" };
const bracketPanel = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 16 };
const bracketHeader = { alignItems: "flex-start", display: "flex", gap: 14, justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap" };
const divisionFilterRow = { display: "flex", flexWrap: "wrap", gap: 8 };
const divisionFilterBtn = { background: "#f8fafc", border: "1px solid #d1d5db", borderRadius: 999, color: "#334155", cursor: "pointer", fontWeight: 900, padding: "8px 11px" };
const divisionFilterActive = { background: "#dcfce7", borderColor: "#16a34a", color: "#166534" };
const emptyBracket = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, color: "#64748b", fontWeight: 800, padding: 18, textAlign: "center" };
const bracketDivision = { marginTop: 16 };
const bracketDivisionTitle = { color: "#0f172a", fontSize: 18, fontWeight: 900, marginBottom: 10 };
const bracketGrid = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" };
const bracketCard = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, boxSizing: "border-box", display: "grid", gap: 8, padding: 12 };
const bracketCardTop = { alignItems: "flex-start", display: "flex", gap: 10, justifyContent: "space-between" };
const bracketGameNumber = { color: "#0f172a", fontSize: 14, fontWeight: 900 };
const bracketMeta = { color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 3 };
const bracketStatus = { borderRadius: 999, fontSize: 11, fontWeight: 900, padding: "5px 8px", textTransform: "uppercase" };
const bracketStatusFinal = { background: "#dcfce7", color: "#166534" };
const bracketStatusScheduled = { background: "#e0f2fe", color: "#075985" };
const bracketTeamLine = { alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#0f172a", display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) auto", padding: "10px 11px" };
const bracketTeamWinner = { borderColor: "#16a34a", boxShadow: "inset 4px 0 0 #16a34a" };
const bracketTeamName = { fontSize: 15, fontWeight: 900, overflowWrap: "anywhere" };
const bracketTeamScore = { fontSize: 20, fontVariantNumeric: "tabular-nums", fontWeight: 900 };
const winnerLine = { color: "#166534", fontSize: 12, fontWeight: 900, marginTop: 2 };
const signOverlay = { alignItems: "center", background: "rgba(15,23,42,0.72)", display: "flex", inset: 0, justifyContent: "center", padding: 20, position: "fixed", zIndex: 3000 };
const signPage = { alignItems: "center", background: "#fff", boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: "min(94vh, 980px)", maxWidth: 760, padding: "42px 46px", position: "relative", textAlign: "center", width: "min(94vw, 760px)" };
const signActions = { display: "flex", gap: 10, position: "absolute", right: 18, top: 18 };
const signActionBtn = { background: "#16a34a", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 900, padding: "10px 12px" };
const signCloseBtn = { background: "#e5e7eb", border: "none", borderRadius: 10, color: "#111827", cursor: "pointer", fontWeight: 900, padding: "10px 12px" };
const signEyebrow = { color: "#2563eb", fontSize: 18, fontWeight: 900, marginTop: 36, textTransform: "uppercase" };
const signTitle = { color: "#0f172a", fontSize: 82, fontWeight: 900, lineHeight: 0.9, marginTop: 16 };
const signSubtitle = { color: "#475569", fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginTop: 18, maxWidth: 600 };
const signQrFrame = { border: "8px solid #0f172a", borderRadius: 24, display: "flex", marginTop: 38, padding: 18 };
const signUrl = { color: "#0f172a", fontSize: 20, fontWeight: 900, marginTop: 24, overflowWrap: "anywhere" };
