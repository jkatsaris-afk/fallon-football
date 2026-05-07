import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../../supabase";

const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];

export default function LiveScoreboardPage() {
  const [fields, setFields] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadLiveGames, 5000);
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

  return (
    <div style={wrap}>
      <div>
        <h2 style={title}>Live Scoreboard Links</h2>
        <div style={subtitle}>
          Each active field has one iPad controller link. The controller can open the score-only display when needed.
        </div>
      </div>

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
        <div style={settingsGrid}>
          <SettingInput label="Game Time" suffix="min" value={settings?.scoreboard_game_minutes || 24} onChange={(value) => updateSetting("scoreboard_game_minutes", value)} />
          <SettingInput label="Halftime" suffix="min" value={settings?.scoreboard_halftime_minutes || 5} onChange={(value) => updateSetting("scoreboard_halftime_minutes", value)} />
          <SettingInput label="Timeout" suffix="sec" value={settings?.scoreboard_timeout_seconds || 60} onChange={(value) => updateSetting("scoreboard_timeout_seconds", value)} />
          <SettingInput label="Touchdown" suffix="pts" value={settings?.scoreboard_touchdown_points || 6} onChange={(value) => updateSetting("scoreboard_touchdown_points", value)} />
          <SettingInput label="Extra 1" suffix="pt" value={settings?.scoreboard_extra_one_points || 1} onChange={(value) => updateSetting("scoreboard_extra_one_points", value)} />
          <SettingInput label="Extra 2" suffix="pts" value={settings?.scoreboard_extra_two_points || 2} onChange={(value) => updateSetting("scoreboard_extra_two_points", value)} />
        </div>
      </div>

      <div style={fieldGrid}>
        {fields.map((field) => {
          const liveGame = getFieldLiveGame(field);
          const masterLink = `${origin}/field-scoreboard/${field.id}`;
          const controllerLink = `${origin}/field-scoreboard/${field.id}/control`;
          const homeDisplayLink = `${origin}/field-scoreboard/${field.id}/display/home`;
          const awayDisplayLink = `${origin}/field-scoreboard/${field.id}/display/away`;
          const hasChampionship = field.scoreboard_phases.includes("championship");
          const hasRegular = field.scoreboard_phases.includes("regular");

          return (
            <div key={field.id} style={fieldCard}>
              <div style={fieldHeader}>
                <div>
                  <div style={fieldName}>{field.name}</div>
                  <div style={fieldMeta}>Field {field.field_number || "—"} • {field.type}</div>
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
                    {liveGame.home_score} - {liveGame.away_score} • {liveGame.clock}
                  </div>
                  <button style={closeBtn} onClick={() => closeGame(liveGame)}>
                    Close Live Game
                  </button>
                </div>
              )}

              <div style={qrGrid}>
                <QrBox label="Controller iPad" href={controllerLink} />
                <QrBox label="Home Display" href={homeDisplayLink} />
                <QrBox label="Away Display" href={awayDisplayLink} />
              </div>

              <LinkBox label="Field Master Link" href={masterLink} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingInput({ label, suffix, value, onChange }) {
  return (
    <label style={settingField}>
      <span style={settingLabel}>{label}</span>
      <div style={settingInputWrap}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={settingInput}
        />
        <span style={settingSuffix}>{suffix}</span>
      </div>
    </label>
  );
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

const wrap = { display: "flex", flexDirection: "column", gap: 18 };
const title = { color: "#0f172a", fontSize: 24, fontWeight: 900, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 14, marginTop: 4 };
const masterPanel = { alignItems: "center", background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", display: "flex", justifyContent: "space-between", gap: 16, padding: 16 };
const masterLink = { color: "#2563eb", display: "inline-block", fontSize: 13, fontWeight: 900, marginTop: 10, textDecoration: "none" };
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
