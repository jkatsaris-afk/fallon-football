import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import UserManagement from "./UserManagement"; // ✅ NEW

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [tab, setTab] = useState("overview");
  const [logoFile, setLogoFile] = useState(null);
  const [status, setStatus] = useState("");
  const [newSeasonYear, setNewSeasonYear] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const [{ data }, { data: seasonData }] = await Promise.all([
      supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single(),
      supabase.from("seasons").select("*").order("year", { ascending: false }),
    ]);

    setSettings(data);
    setSeasons(seasonData || []);
  };

  const update = async (field, value) => {
    setStatus("");
    const { error } = await supabase
      .from("app_settings")
      .update({ [field]: value })
      .eq("id", 1);

    if (error) {
      console.error(error);
      setStatus(`${field} could not be saved. You may need the settings SQL update.`);
      return;
    }

    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const updateSeason = async (seasonId) => {
    const season = seasons.find((item) => item.id === seasonId);
    if (!season) return;

    const payload = { current_season: Number(season.year || settings.current_season) };
    if ("current_season_uuid" in settings) payload.current_season_uuid = season.id;

    setStatus("");
    const { error } = await supabase.from("app_settings").update(payload).eq("id", 1);
    if (error) {
      console.error(error);
      setStatus("Current season could not be saved.");
      return;
    }

    setSettings((prev) => ({ ...prev, ...payload }));
    setStatus("Current season updated.");
  };

  const uploadBrandLogo = async () => {
    if (!logoFile) {
      setStatus("Choose a logo file first.");
      return;
    }

    const path = `league-${Date.now()}-${logoFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(path, logoFile, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      setStatus("Logo could not be uploaded. Make sure the branding storage bucket exists.");
      return;
    }

    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    await update("branding_logo_url", data.publicUrl);
    setLogoFile(null);
    setStatus("League logo updated.");
  };

  const startNewSeason = async () => {
    const year = Number(newSeasonYear);
    if (!year || year < 2000) {
      setStatus("Enter a valid season year first.");
      return;
    }

    const { data: existing } = await supabase
      .from("seasons")
      .select("*")
      .eq("year", year)
      .maybeSingle();

    let season = existing;
    if (!season) {
      const { data, error } = await supabase
        .from("seasons")
        .insert([{ year, name: String(year), is_active: true }])
        .select("*")
        .single();

      if (error) {
        console.error(error);
        setStatus("New season could not be created.");
        return;
      }
      season = data;
    }

    setSeasons((current) => (
      current.some((item) => item.id === season.id)
        ? current
        : [season, ...current].sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
    ));
    const payload = { current_season: year };
    if ("current_season_uuid" in settings) payload.current_season_uuid = season.id;
    const { error: settingsError } = await supabase.from("app_settings").update(payload).eq("id", 1);
    if (settingsError) {
      console.error(settingsError);
      setStatus("Season was created, but could not be selected.");
      return;
    }
    setSettings((prev) => ({ ...prev, ...payload }));
    setNewSeasonYear("");
    setStatus(`Season ${year} is now active. People will only move into this season when they sign up again.`);
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div style={pageWrap}>
      <div>
        <h1 style={title}>Settings</h1>
        <div style={subtitle}>Manage league branding, active season, registration, access, and live scoreboard defaults.</div>
      </div>

      <div style={tabs}>
        <Tab
          label="Overview"
          active={tab === "overview"}
          onClick={() => setTab("overview")}
        />
        <Tab
          label="League Settings"
          active={tab === "general"}
          onClick={() => setTab("general")}
        />
        <Tab
          label="Users"
          active={tab === "users"}
          onClick={() => setTab("users")}
        />
      </div>

      {tab === "overview" && (
        <>
          <div style={overviewGrid}>
            <OverviewTile title="League" value={settings.league_name || "Fallon Football"} text="Public branding name" />
            <OverviewTile title="Season" value={getCurrentSeasonLabel(settings, seasons)} text="Current active season" />
            <OverviewTile title="Player Signups" value={settings.signups_open ? "Open" : "Closed"} text="Public player registration" />
            <OverviewTile title="Coach Rankings" value={settings.coach_rankings_open ? "Open" : "Closed"} text="Public coach ranking form" />
            <OverviewTile title="Scoreboard" value={(settings.scoreboard_period_format || "half").toUpperCase()} text={`${settings.scoreboard_game_minutes || 24} minute ${getPeriodName(settings).toLowerCase()}`} />
          </div>

          <Tile title="Settings Overview">
            <div style={helperText}>
              League Settings controls public signup windows, fees, season year, coach ranking access, and live scoreboard defaults. User Management is where admin, coach, parent, and referee access is handled.
            </div>
          </Tile>
        </>
      )}

      {tab === "general" && (
        <div style={settingsGrid}>
          {status && <div style={statusBox}>{status}</div>}

          <Tile
            title="League Branding"
            description="Public name and logo used across league-facing tools."
          >
            <InputRow
              label="League Name"
              value={settings.league_name || ""}
              placeholder="Fallon Football"
              onChange={(val) => update("league_name", val)}
            />

            <div style={logoRow}>
              <div style={logoPreview}>
                {settings.branding_logo_url ? (
                  <img src={settings.branding_logo_url} alt="League logo" style={logoImg} />
                ) : (
                  <span>No logo</span>
                )}
              </div>
              <label style={fileBtn}>
                Choose Logo
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
              </label>
              <button style={saveLogoBtn} onClick={uploadBrandLogo}>Upload</button>
            </div>
            {logoFile && <div style={fileName}>{logoFile.name}</div>}
          </Tile>

          <Tile
            title="Active Season"
            description="Switch the working year. New signups attach to the selected season only."
          >
            <SelectRow
              label="Current Season"
              value={getCurrentSeasonId(settings, seasons)}
              onChange={updateSeason}
              options={getUniqueSeasonOptions(seasons, settings).map((season) => ({
                value: season.id,
                label: season.year || season.name,
              }))}
              placeholder={settings.current_season ? `Season ${settings.current_season}` : "Select season"}
            />
            <div style={newSeasonRow}>
              <input
                value={newSeasonYear}
                onChange={(e) => setNewSeasonYear(e.target.value)}
                placeholder="New season year"
                style={newSeasonInput}
              />
              <button style={newSeasonBtn} onClick={startNewSeason}>Start New Season</button>
            </div>
          </Tile>

          {/* REGISTRATION */}
          <Tile
            title="Registration"
            description="Control which public signup forms are open."
          >

            <ToggleRow
              label="Player Signups Open"
              value={settings.signups_open}
              onChange={(val) => update("signups_open", val)}
            />

            <div style={{ height: 10 }} />

            <ToggleRow
              label="Coach Signups Open"
              value={settings.coach_signups_open}
              onChange={(val) => update("coach_signups_open", val)}
            />

            <div style={{ height: 10 }} />

            <ToggleRow
              label="Ref Signups Open"
              value={settings.ref_signups_open}
              onChange={(val) => update("ref_signups_open", val)}
            />

          </Tile>

          {/* COACH TOOLS */}
          <Tile
            title="Coach Tools"
            description="Public forms used by coaches."
          >

            <ToggleRow
              label="Coach Player Rankings Open"
              value={settings.coach_rankings_open}
              onChange={(val) => update("coach_rankings_open", val)}
            />

            <div style={{ fontSize: 12, color: "#64748b" }}>
              Controls the public /coach-rankings form.
            </div>

          </Tile>

          {/* FEES */}
          <Tile title="Fees" description="Default player registration amount.">
            <InputRow
              label="Registration Fee ($)"
              value={settings.registration_fee}
              onChange={(val) => update("registration_fee", Number(val))}
            />
          </Tile>

          {/* SCOREBOARD */}
          <Tile
            title="Live Scoreboard"
            description="Default timing and scoring values for game controllers."
            wide
          >
            <SegmentedRow
              label="Scoreboard Format"
              value={settings.scoreboard_period_format || "half"}
              options={[
                { label: "Half", value: "half" },
                { label: "Quarter", value: "quarter" }
              ]}
              onChange={(val) => update("scoreboard_period_format", val)}
            />
            <div style={compactGrid}>
              <InputRow
                label={`${getPeriodName(settings)} Length (minutes)`}
                value={settings.scoreboard_game_minutes || 24}
                onChange={(val) => update("scoreboard_game_minutes", Number(val))}
              />
              <InputRow
                label="Halftime (minutes)"
                value={settings.scoreboard_halftime_minutes || 5}
                onChange={(val) => update("scoreboard_halftime_minutes", Number(val))}
              />
              <InputRow
                label="Timeout (seconds)"
                value={getTimeoutSettingValue(settings)}
                onChange={(val) => update("scoreboard_timeout_seconds", Number(val))}
              />
              <InputRow
                label="Touchdown Points"
                value={settings.scoreboard_touchdown_points || 6}
                onChange={(val) => update("scoreboard_touchdown_points", Number(val))}
              />
              <InputRow
                label="1 Point Extra"
                value={settings.scoreboard_extra_one_points || 1}
                onChange={(val) => update("scoreboard_extra_one_points", Number(val))}
              />
              <InputRow
                label="2 Point Extra"
                value={settings.scoreboard_extra_two_points || 2}
                onChange={(val) => update("scoreboard_extra_two_points", Number(val))}
              />
            </div>
          </Tile>

        </div>
      )}

      {/* 🔥 USER MANAGEMENT TAB */}
      {tab === "users" && (
        <div style={{ marginTop: 20 }}>
          <UserManagement />
        </div>
      )}
    </div>
  );
}

/* 🔥 TAB COMPONENT */
function Tab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabBtn,
        ...(active ? activeTabBtn : {}),
      }}
    >
      <div style={tabTitle}>{label}</div>
    </button>
  );
}

function OverviewTile({ title, value, text }) {
  return (
    <div style={overviewTile}>
      <div style={overviewLabel}>{title}</div>
      <div style={overviewValue}>{value}</div>
      <div style={overviewText}>{text}</div>
    </div>
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

const tabs = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

const tabBtn = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  cursor: "pointer",
  minHeight: 74,
  padding: 16,
  textAlign: "left",
};

const activeTabBtn = {
  outline: "2px solid #16a34a",
  boxShadow: "0 10px 28px rgba(22,163,74,0.16)",
};

const tabTitle = {
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 900,
};

const overviewGrid = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
};

const overviewTile = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  padding: 16,
};

const overviewLabel = { color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const overviewValue = { color: "#0f172a", fontSize: 27, fontWeight: 950, marginTop: 4 };
const overviewText = { color: "#64748b", fontSize: 12, fontWeight: 750, marginTop: 3 };
const helperText = { color: "#475569", fontSize: 13, fontWeight: 700, lineHeight: 1.5 };

const settingsGrid = {
  display: "grid",
  alignItems: "start",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginTop: 4,
};

const statusBox = {
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  borderRadius: 14,
  color: "#166534",
  fontWeight: 800,
  gridColumn: "1 / -1",
  padding: "11px 13px",
};

const logoRow = {
  alignItems: "center",
  display: "grid",
  gap: 10,
  gridTemplateColumns: "70px minmax(0, 1fr) minmax(92px, auto)",
};

const logoPreview = {
  alignItems: "center",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  color: "#94a3b8",
  display: "flex",
  fontSize: 11,
  fontWeight: 800,
  height: 64,
  justifyContent: "center",
  overflow: "hidden",
};

const logoImg = {
  height: "100%",
  objectFit: "contain",
  padding: 6,
  width: "100%",
};

const fileBtn = {
  alignItems: "center",
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  color: "#334155",
  cursor: "pointer",
  display: "flex",
  fontWeight: 900,
  justifyContent: "center",
  minHeight: 44,
  padding: "11px 12px",
  textAlign: "center",
};

const saveLogoBtn = {
  alignItems: "center",
  background: "#166534",
  border: "none",
  borderRadius: 12,
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  fontWeight: 900,
  justifyContent: "center",
  minHeight: 44,
  padding: "12px 13px",
};

const fileName = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const newSeasonBtn = {
  alignItems: "center",
  background: "#0f172a",
  border: "none",
  borderRadius: 12,
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  fontWeight: 900,
  justifyContent: "center",
  minHeight: 44,
  padding: "12px 13px",
  whiteSpace: "nowrap",
};

const newSeasonRow = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "minmax(0, 1fr) auto",
};

const newSeasonInput = {
  boxSizing: "border-box",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  minHeight: 44,
  minWidth: 0,
  padding: "11px 12px",
  width: "100%",
};

const compactGrid = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

const fieldWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

const fieldLabel = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const controlStyle = {
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  boxSizing: "border-box",
  color: "#0f172a",
  fontSize: 14,
  fontWeight: 800,
  minHeight: 44,
  minWidth: 0,
  padding: "11px 12px",
  width: "100%",
};

/* (UNCHANGED HELPERS BELOW) */

function Tile({ title, description, children, wide }) {
  return (
    <div style={{
      background:"#fff",
      border:"1px solid #e2e8f0",
      borderRadius:16,
      boxShadow:"0 8px 24px rgba(15,23,42,0.08)",
      boxSizing:"border-box",
      display:"flex",
      flexDirection:"column",
      gap:14,
      gridColumn:wide ? "1 / -1" : undefined,
      minWidth:0,
      overflow:"hidden",
      padding:18
    }}>
      <div>
        <div style={{fontWeight:900,fontSize:17,color:"#0f172a"}}>{title}</div>
        {description && <div style={{color:"#64748b",fontSize:12,fontWeight:700,lineHeight:1.35,marginTop:4}}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function InputRow({ label, value, onChange, placeholder = "" }) {
  return (
    <div style={fieldWrap}>
      <div style={fieldLabel}>
        {label}
      </div>
      <input
        value={value || ""}
        placeholder={placeholder}
        onChange={(e)=>onChange(e.target.value)}
        style={controlStyle}
      />
    </div>
  );
}

function SelectRow({ label, value, options, onChange, placeholder }) {
  return (
    <div style={fieldWrap}>
      <div style={fieldLabel}>
        {label}
      </div>
      <select
        value={value || ""}
        onChange={(e)=>onChange(e.target.value)}
        style={controlStyle}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{
      background:"#f8fafc",
      border:"1px solid #e2e8f0",
      borderRadius:12,
      display:"flex",
      justifyContent:"space-between",
      alignItems:"center",
      gap:12,
      minHeight:48,
      padding:"10px 12px"
    }}>
      <div style={{color:"#334155",fontWeight:800}}>{label}</div>
      <div
        onClick={()=>onChange(!value)}
        style={{
          width:50,
          height:26,
          borderRadius:20,
          background:value?"#2f6ea6":"#cbd5f5",
          position:"relative",
          cursor:"pointer"
        }}
      >
        <div style={{
          width:22,
          height:22,
          borderRadius:"50%",
          background:"#fff",
          position:"absolute",
          top:2,
          left:value?26:2
        }}/>
      </div>
    </div>
  );
}

function SegmentedRow({ label, value, options, onChange }) {
  return (
    <div style={fieldWrap}>
      <div style={fieldLabel}>
        {label}
      </div>
      <div style={{
        background:"#e2e8f0",
        borderRadius:12,
        display:"grid",
        gap:4,
        gridTemplateColumns:`repeat(${options.length}, minmax(0, 1fr))`,
        padding:4
      }}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              style={{
                background:active ? "#fff" : "transparent",
                border:"none",
                borderRadius:9,
                boxShadow:active ? "0 2px 8px rgba(15,23,42,0.12)" : "none",
                color:active ? "#0f172a" : "#475569",
                cursor:"pointer",
                fontWeight:800,
                minHeight:40,
                padding:"10px 12px"
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getPeriodName(settings) {
  return settings?.scoreboard_period_format === "quarter" ? "Quarter" : "Half";
}

function getTimeoutSettingValue(settings) {
  const rawValue = Number(settings?.scoreboard_timeout_seconds || 60);
  return rawValue > 300 ? Math.round(rawValue / 60) : rawValue;
}

function getCurrentSeasonId(settings, seasons) {
  const match = seasons.find((season) => (
    String(season.year) === String(settings?.current_season) ||
    season.id === settings?.current_season_uuid
  ));
  return match?.id || "";
}

function getCurrentSeasonLabel(settings, seasons) {
  const match = seasons.find((season) => (
    String(season.year) === String(settings?.current_season) ||
    season.id === settings?.current_season_uuid
  ));
  return match?.year || settings?.current_season || "-";
}

function getUniqueSeasonOptions(seasons, settings) {
  const currentId = getCurrentSeasonId(settings, seasons);
  const byYear = new Map();
  seasons.forEach((season) => {
    const key = String(season.year || season.name || season.id);
    if (!byYear.has(key) || season.id === currentId) {
      byYear.set(key, season);
    }
  });
  return [...byYear.values()].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
}
