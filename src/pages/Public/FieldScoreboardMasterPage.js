import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../supabase";

const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];

export default function FieldScoreboardMasterPage() {
  const [fields, setFields] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [settings, setSettings] = useState({});
  const [deviceFlow, setDeviceFlow] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadLiveGames, 3000);
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
  };

  const loadLiveGames = async () => {
    const { data, error } = await supabase
      .from("games_live")
      .select("*")
      .in("status", LIVE_GAME_STATUSES)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Master scoreboard load failed:", error);
      setLiveGames([]);
      return;
    }

    const scheduleIds = [...new Set((data || []).map((game) => game.schedule_id).filter(Boolean))];
    if (!scheduleIds.length) {
      setLiveGames([]);
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

  const getFieldLiveGame = (field) => (
    liveGames.find((game) => (
      (field.scoreboard_field_ids || [field.id]).includes(game.schedule_master_auto?.field_id)
    ))
  );

  const updateSetting = async (field, value) => {
    setStatus(null);
    const { data, error } = await supabase
      .from("app_settings")
      .update({ [field]: value })
      .eq("id", 1)
      .select("id");

    if (error) {
      console.error("Master scoreboard setting update failed:", error);
      setStatus({
        type: "error",
        message: "Could not update scoreboard settings. Run the live scoreboard SQL in Supabase, then try again.",
      });
      return;
    }

    if (!data?.length) {
      const { error: insertError } = await supabase
        .from("app_settings")
        .insert({ id: 1, [field]: value });

      if (insertError) {
        console.error("Master scoreboard setting insert failed:", insertError);
        setStatus({
          type: "error",
          message: "Could not create app settings. Run the live scoreboard SQL in Supabase, then try again.",
        });
        return;
      }
    }

    setSettings((current) => ({ ...current, [field]: value }));
    setStatus({
      type: "success",
      message: field === "live_scoreboards_open"
        ? `Live scoreboards turned ${value ? "on" : "off"}.`
        : "Scoreboard setting saved.",
    });
  };

  const origin = window.location.origin;
  const scoreboardsOpen = settings?.live_scoreboards_open !== false;

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <div style={eyebrow}>Live Scoreboard Master</div>
          <h1 style={title}>All Fields</h1>
        </div>
        <button
          type="button"
          style={{ ...systemBadge, ...(scoreboardsOpen ? systemOn : systemOff) }}
          onClick={() => updateSetting("live_scoreboards_open", !scoreboardsOpen)}
        >
          {scoreboardsOpen ? "Scoreboards On" : "Scoreboards Off"}
        </button>
      </header>

      <section style={settingsPanel}>
        {status && (
          <div style={{ ...statusBox, ...(status.type === "error" ? statusError : statusSuccess) }}>
            {status.message}
          </div>
        )}

        <div style={settingsTop}>
          <div>
            <div style={panelTitle}>Scoreboard Settings</div>
            <div style={panelHint}>Changes apply to new games started from field controllers.</div>
          </div>
          <button
            type="button"
            style={{ ...toggleButton, ...(scoreboardsOpen ? toggleOn : toggleOff) }}
            onClick={() => updateSetting("live_scoreboards_open", !scoreboardsOpen)}
          >
            {scoreboardsOpen ? "On" : "Off"}
          </button>
        </div>

        <PeriodFormatToggle
          value={settings?.scoreboard_period_format || "half"}
          onChange={(value) => updateSetting("scoreboard_period_format", value)}
        />

        <div style={settingsGrid}>
          <SettingInput label={getPeriodLengthLabel(settings)} suffix="min" value={settings?.scoreboard_game_minutes || 24} onChange={(value) => updateSetting("scoreboard_game_minutes", value)} />
          <SettingInput label="Halftime" suffix="min" value={settings?.scoreboard_halftime_minutes || 5} onChange={(value) => updateSetting("scoreboard_halftime_minutes", value)} />
          <SettingInput label="Timeout" suffix="sec" value={getTimeoutSettingValue(settings)} onChange={(value) => updateSetting("scoreboard_timeout_seconds", value)} />
          <SettingInput label="Timeouts" suffix="/half" value={settings?.scoreboard_timeouts_per_half || 3} onChange={(value) => updateSetting("scoreboard_timeouts_per_half", value)} />
          <SettingInput label="TD" suffix="pts" value={settings?.scoreboard_touchdown_points || 6} onChange={(value) => updateSetting("scoreboard_touchdown_points", value)} />
          <SettingInput label="XP 1" suffix="pt" value={settings?.scoreboard_extra_one_points || 1} onChange={(value) => updateSetting("scoreboard_extra_one_points", value)} />
          <SettingInput label="XP 2" suffix="pts" value={settings?.scoreboard_extra_two_points || 2} onChange={(value) => updateSetting("scoreboard_extra_two_points", value)} />
        </div>
      </section>

      <div style={fieldGrid}>
        {fields.map((field) => {
          const liveGame = getFieldLiveGame(field);
          const game = liveGame?.schedule_master_auto;

          return (
            <section key={field.id} style={fieldCard}>
              <div style={fieldBody}>
                <div style={fieldTop}>
                  <div>
                    <div style={fieldName}>{field.name}</div>
                    <div style={fieldMeta}>Field {field.field_number || "-"} • {field.type}</div>
                  </div>
                  <div style={{ ...fieldStatus, ...(liveGame ? liveStatus : idleStatus) }}>
                    {liveGame ? "Live" : "Idle"}
                  </div>
                </div>

                {liveGame ? (
                  <div style={scoreBox}>
                    <div style={teams}>
                      {cleanTeamName(game?.team)} vs {cleanTeamName(game?.opponent)}
                    </div>
                    <div style={scoreLine}>
                      <span>{liveGame.home_score || 0}</span>
                      <span style={dash}>-</span>
                      <span>{liveGame.away_score || 0}</span>
                    </div>
                    <div style={clock}>{liveGame.clock || "0:00"}</div>
                    {liveGame.status !== "live" && (
                      <div style={modeBadge}>{getLiveModeLabel(liveGame.status)}</div>
                    )}
                  </div>
                ) : (
                  <div style={idleCopy}>No live game on this field.</div>
                )}

                <button
                  type="button"
                  style={addDeviceBtn}
                  onClick={() => setDeviceFlow({ field, type: null })}
                >
                  Add Device
                </button>
              </div>
            </section>
          );
        })}
      </div>

      {deviceFlow && (
        <DeviceOverlay
          field={deviceFlow.field}
          type={deviceFlow.type}
          origin={origin}
          onSelect={(type) => setDeviceFlow((current) => ({ ...current, type }))}
          onBack={() => setDeviceFlow((current) => ({ ...current, type: null }))}
          onClose={() => setDeviceFlow(null)}
        />
      )}
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
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          style={settingInput}
        />
        <span style={settingSuffix}>{suffix}</span>
      </div>
    </label>
  );
}

function getPeriodLengthLabel(settings) {
  return settings?.scoreboard_period_format === "quarter" ? "Quarter Length" : "Half Length";
}

function getTimeoutSettingValue(settings) {
  const rawValue = Number(settings?.scoreboard_timeout_seconds || 60);
  return rawValue > 300 ? Math.round(rawValue / 60) : rawValue;
}

function DeviceOverlay({ field, type, origin, onSelect, onBack, onClose }) {
  const deviceLabel = getDeviceLabel(type);
  const href = type ? `${origin}/field-scoreboard/${field.id}/${type}` : "";

  return (
    <div style={overlay}>
      <div style={overlayPanel}>
        <div style={overlayHeader}>
          <div>
            <div style={overlayEyebrow}>{field.name}</div>
            <div style={overlayTitle}>{type ? deviceLabel : "Add Device"}</div>
          </div>
          <button type="button" style={closeBtn} onClick={onClose}>Close</button>
        </div>

        {!type ? (
          <div style={choiceGrid}>
            <button type="button" style={choiceBtn} onClick={() => onSelect("control")}>
              <div style={choiceTitle}>Controller iPad</div>
              <div style={choiceText}>Runs the clock, starts games, adds scores, and saves finals.</div>
            </button>
            <button type="button" style={choiceBtn} onClick={() => onSelect("display")}>
              <div style={choiceTitle}>Combined Display</div>
              <div style={choiceText}>Full scoreboard view for a TV or big screen.</div>
            </button>
            <button type="button" style={choiceBtn} onClick={() => onSelect("display/home")}>
              <div style={choiceTitle}>Home Display iPad</div>
              <div style={choiceText}>One-team score board for the home side of the field.</div>
            </button>
            <button type="button" style={choiceBtn} onClick={() => onSelect("display/away")}>
              <div style={choiceTitle}>Away Display iPad</div>
              <div style={choiceText}>One-team score board for the away side of the field.</div>
            </button>
          </div>
        ) : (
          <div style={qrFull}>
            <div style={qrFullFrame}>
              <QRCodeSVG value={href} size={360} level="M" includeMargin />
            </div>
            <a href={href} target="_blank" rel="noreferrer" style={openLink}>Open {deviceLabel}</a>
            <button type="button" style={backBtn} onClick={onBack}>Choose Different Device</button>
          </div>
        )}
      </div>
    </div>
  );
}

function getDeviceLabel(type) {
  if (type === "control") return "Controller iPad";
  if (type === "display") return "Combined Display";
  if (type === "display/home") return "Home Display iPad";
  if (type === "display/away") return "Away Display iPad";
  return "Display iPad";
}

function groupPhysicalFields(fields) {
  const grouped = new Map();

  fields.forEach((field) => {
    const phase = field.season_phase || "regular";
    const key = [cleanKey(field.name), field.field_number || "", cleanKey(field.type)].join("|");
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...field, scoreboard_field_ids: [field.id], scoreboard_phases: [phase] });
      return;
    }

    existing.scoreboard_field_ids.push(field.id);
    if (!existing.scoreboard_phases.includes(phase)) existing.scoreboard_phases.push(phase);

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

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function getLiveModeLabel(status) {
  if (status === "halftime") return "Halftime";
  if (status === "timeout" || status === "timeout_home" || status === "timeout_away") return "Timeout";
  if (status === "final_display") return "Final";
  return status || "Live";
}

function cleanKey(value) {
  return (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

const wrap = { background: "#f8fafc", boxSizing: "border-box", minHeight: "100vh", padding: 18 };
const header = { alignItems: "center", color: "#0f172a", display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 18 };
const eyebrow = { color: "#2563eb", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const title = { fontSize: 36, fontWeight: 900, lineHeight: 1, margin: "4px 0 0" };
const systemBadge = { border: "none", borderRadius: 999, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 900, padding: "10px 14px", whiteSpace: "nowrap" };
const systemOn = { background: "#16a34a" };
const systemOff = { background: "#dc2626" };
const settingsPanel = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", marginBottom: 16, padding: 16 };
const statusBox = { borderRadius: 12, fontSize: 14, fontWeight: 900, marginBottom: 14, padding: "11px 12px" };
const statusSuccess = { background: "#dcfce7", color: "#166534" };
const statusError = { background: "#fee2e2", color: "#991b1b" };
const settingsTop = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 14 };
const panelTitle = { color: "#0f172a", fontSize: 18, fontWeight: 900 };
const panelHint = { color: "#64748b", fontSize: 13, fontWeight: 800, marginTop: 3 };
const toggleButton = { border: "none", borderRadius: 999, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 900, minWidth: 78, padding: "10px 14px" };
const toggleOn = { background: "#16a34a" };
const toggleOff = { background: "#dc2626" };
const settingsGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(126px, 1fr))", marginTop: 14 };
const formatToggleWrap = { display: "grid", gap: 8, marginTop: 14 };
const formatToggle = { background: "#e2e8f0", borderRadius: 14, display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr", maxWidth: 360, padding: 4 };
const formatBtn = { background: "transparent", border: "none", borderRadius: 11, color: "#475569", cursor: "pointer", fontSize: 15, fontWeight: 900, padding: "12px 14px" };
const formatBtnActive = { background: "#fff", boxShadow: "0 2px 8px rgba(15,23,42,0.12)", color: "#0f172a" };
const settingField = { display: "flex", flexDirection: "column", gap: 5 };
const settingLabel = { color: "#475569", fontSize: 11, fontWeight: 900, textTransform: "uppercase" };
const settingInputWrap = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, display: "flex", overflow: "hidden" };
const settingInput = { background: "transparent", border: "none", flex: 1, fontSize: 16, fontWeight: 900, minWidth: 0, padding: 11, width: "100%" };
const settingSuffix = { color: "#64748b", fontSize: 12, fontWeight: 900, paddingRight: 10 };
const fieldGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" };
const fieldCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", overflow: "hidden" };
const fieldBody = { padding: 16 };
const fieldTop = { alignItems: "flex-start", display: "flex", justifyContent: "space-between", gap: 12 };
const fieldName = { color: "#0f172a", fontSize: 24, fontWeight: 900 };
const fieldMeta = { color: "#64748b", fontSize: 13, fontWeight: 800, marginTop: 2 };
const fieldStatus = { borderRadius: 999, fontSize: 12, fontWeight: 900, padding: "6px 9px", whiteSpace: "nowrap" };
const liveStatus = { background: "#dcfce7", color: "#166534" };
const idleStatus = { background: "#fff", color: "#334155" };
const scoreBox = { marginTop: 16, textAlign: "center" };
const teams = { color: "#334155", fontSize: 16, fontWeight: 900, minHeight: 22 };
const scoreLine = { alignItems: "center", color: "#0f172a", display: "flex", fontSize: 74, fontVariantNumeric: "tabular-nums", fontWeight: 900, justifyContent: "center", lineHeight: 0.95, marginTop: 8 };
const dash = { color: "#64748b", padding: "0 12px" };
const clock = { color: "#2563eb", fontSize: 26, fontWeight: 900, marginTop: 4 };
const modeBadge = { background: "#dbeafe", borderRadius: 999, color: "#1d4ed8", display: "inline-block", fontSize: 12, fontWeight: 900, marginTop: 8, padding: "5px 9px", textTransform: "uppercase" };
const idleCopy = { color: "#475569", fontSize: 18, fontWeight: 900, marginTop: 22 };
const addDeviceBtn = { background: "#111827", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 900, marginTop: 16, padding: "12px 14px", width: "100%" };
const overlay = { alignItems: "center", background: "rgba(15,23,42,0.88)", boxSizing: "border-box", display: "flex", inset: 0, justifyContent: "center", padding: 18, position: "fixed", zIndex: 1000 };
const overlayPanel = { background: "#fff", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", maxWidth: 760, padding: 20, width: "100%" };
const overlayHeader = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 14 };
const overlayEyebrow = { color: "#2563eb", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const overlayTitle = { color: "#0f172a", fontSize: 32, fontWeight: 900, marginTop: 2 };
const closeBtn = { background: "#e5e7eb", border: "none", borderRadius: 12, color: "#111827", cursor: "pointer", fontWeight: 900, padding: "10px 12px" };
const choiceGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 18 };
const choiceBtn = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, cursor: "pointer", padding: 18, textAlign: "left" };
const choiceTitle = { color: "#0f172a", fontSize: 22, fontWeight: 900 };
const choiceText = { color: "#64748b", fontSize: 14, fontWeight: 800, lineHeight: 1.4, marginTop: 8 };
const qrFull = { alignItems: "center", display: "flex", flexDirection: "column", gap: 14, marginTop: 18 };
const qrFullFrame = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, display: "flex", padding: 14 };
const openLink = { background: "#2563eb", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 900, padding: "12px 16px", textDecoration: "none" };
const backBtn = { background: "#f1f5f9", border: "none", borderRadius: 12, color: "#334155", cursor: "pointer", fontWeight: 900, padding: "12px 16px" };
