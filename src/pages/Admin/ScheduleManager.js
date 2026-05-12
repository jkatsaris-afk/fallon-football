import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { applyPersonSeasonFilter, applyUuidSeasonFilter, getActiveSeason } from "../../utils/season";

/* ================= LOGOS ================= */

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

const teamLogos = {
  bills, bengals, broncos, lions, colts,
  chiefs, raiders, rams, jets, eagles,
  steelers, "49ers": niners,
  ravens
};

export default function ScheduleManager() {
  const [schedule, setSchedule] = useState([]);
  const [fields, setFields] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [fieldTimeBlocks, setFieldTimeBlocks] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [status, setStatus] = useState(null);
  const [activeTool, setActiveTool] = useState("overview");
  const [weekToSchedule, setWeekToSchedule] = useState("");
  const [weekDate, setWeekDate] = useState("");
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const TABLE = "schedule_master_auto";

  useEffect(() => {
    loadAll();
  }, []);

  /* ================= LOAD ================= */

  const loadAll = async () => {
    const active = await getActiveSeason();
    const { data: s } = await applyUuidSeasonFilter(supabase.from(TABLE).select("*"), active);

    const { data: f } = await supabase
      .from("fields")
      .select("*")
      .order("field_number");

    const { data: m } = await supabase.from("matchups").select("*").eq("season_year", active.seasonYear || 0);
    const { data: t } = await applyPersonSeasonFilter(supabase.from("teams").select("*"), active);
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: slots } = await supabase.from("field_time_slots").select("*");
    const { data: fieldBlocks } = await supabase
      .from("field_time_blocks")
      .select("*")
      .eq("is_active", true);

    setSchedule(s || []);
    setAllFields(f || []);
    setFields((f || []).filter((field) => (
      (field.season_phase || "regular") === "regular" &&
      field.type === "game"
    )));
    setMatchups(m || []);
    setTeams(t || []);
    setNflTeams(nfl || []);
    setTimeSlots(slots || []);
    setFieldTimeBlocks(fieldBlocks || []);
  };

  /* ================= GENERATE ================= */

  const getFieldPool = (division, phase = "regular") => {
    const phaseFields = allFields.filter((field) => (
      (field.season_phase || "regular") === phase &&
      field.type === "game"
    ));

    const divisionFields = phaseFields.filter((field) => field.division === division);
    if (divisionFields.length) return divisionFields;

    return phaseFields.filter((field) => !field.division);
  };

  const getGameTimeSlots = () => (
    timeSlots
      .filter((slot) => slot.field_type === "game")
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  );

  const getFieldTimeSlots = (fieldId) => {
    const blocks = fieldTimeBlocks
      .filter((block) => block.field_id === fieldId)
      .sort((a, b) => (a.sort_order || timeToMinutes(a.time)) - (b.sort_order || timeToMinutes(b.time)));

    return blocks.length ? blocks : getGameTimeSlots();
  };

  const buildScheduleRowsForWeek = (week, eventDate) => {
    const weekGames = matchups.filter((matchup) => String(matchup.week) === String(week));
    const rows = [];
    let gameIndexByDivision = {};

    weekGames.forEach((game) => {
      const homeTeam = teams.find(t => t.id === game.home_team_id);
      const awayTeam = teams.find(t => t.id === game.away_team_id);
      const homeNFL = nflTeams.find(n => n.id === homeTeam?.nfl_team_id);
      const awayNFL = nflTeams.find(n => n.id === awayTeam?.nfl_team_id);
      const validFields = getFieldPool(game.division, "regular");

      if (!validFields.length) return;

      const divisionIndex = gameIndexByDivision[game.division] || 0;
      const field = validFields[divisionIndex % validFields.length];
      const validTimes = getFieldTimeSlots(field?.id);
      const time = validTimes[Math.floor(divisionIndex / validFields.length)];

      if (!field || !time) return;

      rows.push({
        matchup_id: game.id,
        week,
        field_id: field.id,
        time: time.time,
        event_time: time.time,
        field: field.name,
        event_date: eventDate || null,
        division: game.division,
        team: homeNFL?.short_name || homeNFL?.full_name || null,
        opponent: awayNFL?.short_name || awayNFL?.full_name || null,
        event_type: "game",
        source: "auto",
        season_id: game.season_id || game.season_uuid || null,
      });

      gameIndexByDivision[game.division] = divisionIndex + 1;
    });

    return rows;
  };

  const generateSchedule = async () => {
    setStatus(null);

    const active = await getActiveSeason();
    const { data: existingSchedule } = await applyUuidSeasonFilter(supabase.from(TABLE).select("week,event_date"), active);

    if (!matchups?.length) {
      setStatus({ type: "error", message: "No matchups found in the database." });
      return;
    }

    if (!fields?.length) {
      setStatus({ type: "error", message: "No fields found in the database." });
      return;
    }
    if (!timeSlots?.length && !fieldTimeBlocks?.length) {
      setStatus({ type: "error", message: "No time slots found in the database." });
      return;
    }

    const dateByWeek = {};
    (existingSchedule || []).forEach((game) => {
      if (game.week && game.event_date && !dateByWeek[game.week]) {
        dateByWeek[game.week] = game.event_date;
      }
    });

    await supabase
      .from(TABLE)
      .delete()
      .eq("season_id", active.seasonId || "00000000-0000-0000-0000-000000000000")
      .neq("id", "00000000-0000-0000-0000-000000000000");

    let insert = [];

    const weeks = [...new Set(matchups.map(m => m.week))].sort((a, b) => Number(a) - Number(b));

    weeks.forEach(week => {
      insert = [...insert, ...buildScheduleRowsForWeek(week, dateByWeek[week])];
    });

    if (!insert.length) {
      setStatus({ type: "error", message: "No schedule rows were generated. Check field and time slot setup." });
      return;
    }

    const { error } = await supabase.from(TABLE).insert(insert.map((row) => ({
      ...row,
      season_id: active.seasonId,
    })));

    if (error) {
      console.error(error);
      setStatus({ type: "error", message: "Schedule insert failed. Check the console for details." });
      return;
    }

    setStatus({ type: "success", message: "Schedule generated from database matchups." });
    setConfirmRegenerate(false);
    await loadAll();
  };

  const scheduleSingleWeek = async () => {
    setStatus(null);

    if (!weekToSchedule || !weekDate) {
      setStatus({ type: "error", message: "Select a week and date before scheduling." });
      return;
    }

    const rows = buildScheduleRowsForWeek(weekToSchedule, weekDate);
    if (!rows.length) {
      setStatus({ type: "error", message: "No rows generated for that week. Check matchups, fields, and time slots." });
      return;
    }

    const active = await getActiveSeason();
    await supabase.from(TABLE).delete().eq("week", weekToSchedule).eq("season_id", active.seasonId || "00000000-0000-0000-0000-000000000000");
    const { error } = await supabase.from(TABLE).insert(rows.map((row) => ({ ...row, season_id: active.seasonId })));

    if (error) {
      console.error("Week schedule insert error:", error);
      setStatus({ type: "error", message: "Could not schedule this week. Check the console for details." });
      return;
    }

    setStatus({ type: "success", message: `Week ${weekToSchedule} scheduled.` });
    await loadAll();
  };

  /* ================= HELPERS ================= */

  const getGame = (scheduleGame) => {
    const m = matchups.find(x => x.id === scheduleGame.matchup_id);

    if (!m) {
      return {
        division: scheduleGame.division,
        home: {
          short_name: scheduleGame.team,
          full_name: scheduleGame.team,
        },
        away: {
          short_name: scheduleGame.opponent,
          full_name: scheduleGame.opponent,
        },
      };
    }

    const home = teams.find(t => t.id === m.home_team_id);
    const away = teams.find(t => t.id === m.away_team_id);

    const homeNFL = nflTeams.find(n => n.id === home?.nfl_team_id);
    const awayNFL = nflTeams.find(n => n.id === away?.nfl_team_id);

    return {
      division: m.division,
      home: homeNFL,
      away: awayNFL
    };
  };

  const timeToMinutes = (value) => {
    if (!value) return 99999;
    const [time, modifier] = value.toString().split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (Number.isNaN(hours)) return 99999;
    if (Number.isNaN(minutes)) minutes = 0;
    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const isScheduledGameRow = (row) => {
    const eventType = (row.event_type || "").toLowerCase();
    return eventType.includes("game") || eventType.includes("champ");
  };

  const weeks = [...new Set(schedule.filter(isScheduledGameRow).map(s => s.week).filter(Boolean))]
    .sort((a, b) => Number(a) - Number(b));
  const matchupWeeks = [...new Set(matchups.map((matchup) => matchup.week))]
    .filter((week) => weeks.some((scheduledWeek) => String(scheduledWeek) === String(week)))
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b));
  const regeneratePreview = (() => {
    const dateByWeek = {};
    schedule.forEach((game) => {
      if (game.week && game.event_date && !dateByWeek[game.week]) {
        dateByWeek[game.week] = game.event_date;
      }
    });

    const generatedRows = matchupWeeks.reduce((total, week) => (
      total + buildScheduleRowsForWeek(week, dateByWeek[week]).length
    ), 0);

    return {
      currentRows: schedule.filter(isScheduledGameRow).length,
      excelRows: schedule.filter((game) => isScheduledGameRow(game) && (game.source || "").toLowerCase() === "excel").length,
      autoRows: schedule.filter((game) => isScheduledGameRow(game) && (game.source || "").toLowerCase() === "auto").length,
      championshipRows: schedule.filter((game) => (game.event_type || "").toLowerCase().includes("champ")).length,
      generatedRows,
      weeks: matchupWeeks.length,
    };
  })();
  const fieldColumns = [
    ...fields,
    ...schedule
      .filter((game) => game.field && !fields.some((field) => field.id === game.field_id || field.name === game.field))
      .map((game) => ({
        id: `schedule-field-${game.field}`,
        name: game.field,
        type: "game",
        scheduleFieldName: game.field,
      }))
      .filter((field, index, list) => list.findIndex((item) => item.name === field.name) === index),
  ];

  const parseDate = (date) => {
    if (!date) return null;
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const getWeekDateRange = (week) => {
    const dates = schedule
      .filter((game) => game.week === week && game.event_date)
      .map((game) => parseDate(game.event_date))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!dates.length) return "";
    const first = dates[0];
    const last = dates[dates.length - 1];
    return first.toDateString() === last.toDateString()
      ? formatDate(first)
      : `${formatDate(first)} - ${formatDate(last)}`;
  };

  const getLogo = (teamName) => {
    if (!teamName) return null;
    const key = cleanTeamName(teamName).toLowerCase();
    if (key.includes("49")) return teamLogos["49ers"];
    return teamLogos[key] || null;
  };

  return (
    <div>

      <h1>Schedule Manager</h1>

      <div style={toolGrid}>
        <ToolTile
          title="Schedule Overview"
          desc={`${schedule.length} schedule rows`}
          active={activeTool === "overview"}
          onClick={() => setActiveTool("overview")}
        />
        <ToolTile
          title="Schedule New Week"
          desc="Generate one week from DB matchups"
          active={activeTool === "week"}
          onClick={() => setActiveTool("week")}
        />
        <ToolTile
          title="Regenerate Season"
          desc="Danger: replaces current schedule"
          active={confirmRegenerate}
          onClick={() => setConfirmRegenerate(true)}
        />
      </div>

      {confirmRegenerate && (
        <div style={dangerPanel}>
          <div>
            <div style={dangerTitle}>Regenerate Season Will Replace This Schedule</div>
            <div style={dangerText}>
              This deletes every current schedule row in schedule_master_auto, then inserts a fresh generated schedule from matchups.
            </div>
            <div style={dangerPreviewGrid}>
              <PreviewStat label="Rows deleted" value={regeneratePreview.currentRows} />
              <PreviewStat label="Excel rows deleted" value={regeneratePreview.excelRows} />
              <PreviewStat label="Auto rows deleted" value={regeneratePreview.autoRows} />
              <PreviewStat label="Champ rows deleted" value={regeneratePreview.championshipRows} />
              <PreviewStat label="Rows inserted" value={regeneratePreview.generatedRows} />
              <PreviewStat label="Weeks rebuilt" value={regeneratePreview.weeks} />
            </div>
          </div>
          <div style={dangerActions}>
            <button style={cancelBtn} onClick={() => setConfirmRegenerate(false)}>
              Cancel
            </button>
            <button
              style={{
                ...dangerBtn,
                ...(regeneratePreview.generatedRows === 0 ? disabledDangerBtn : {}),
              }}
              disabled={regeneratePreview.generatedRows === 0}
              onClick={generateSchedule}
            >
              Yes, Regenerate
            </button>
          </div>
        </div>
      )}

      {status && (
        <div style={{
          ...statusBox,
          ...(status.type === "error" ? errorBox : successBox),
        }}>
          {status.message}
        </div>
      )}

      {activeTool === "week" && (
        <div style={panel}>
          <h2 style={panelTitle}>Schedule New Week</h2>
          <div style={formGrid}>
            <label style={fieldGroup}>
              <span style={formLabel}>Week</span>
              <select style={input} value={weekToSchedule} onChange={(e) => setWeekToSchedule(e.target.value)}>
                <option value="">Select Week</option>
                {matchupWeeks.map((week) => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </label>
            <label style={fieldGroup}>
              <span style={formLabel}>Game Date</span>
              <input style={input} type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
            </label>
            <button style={btn} onClick={scheduleSingleWeek}>Schedule Week</button>
          </div>
        </div>
      )}

      {weeks.map(week => {
        const weekGames = schedule
          .filter(s => s.week === week && isScheduledGameRow(s))
          .sort((a, b) => timeToMinutes(a.time || a.event_time) - timeToMinutes(b.time || b.event_time));

        return (
          <section key={week} style={weekBlock}>
            <h2 style={weekHeader}>
              Week {week}
              {getWeekDateRange(week) && (
                <div style={weekDateStyle}>{getWeekDateRange(week)}</div>
              )}
            </h2>

            <div style={scheduleCardGrid}>
              {weekGames.map((game) => {
                const gameInfo = getGame(game);
                const homeName = cleanTeamName(gameInfo?.home?.short_name || game.team || "Team");
                const awayName = cleanTeamName(gameInfo?.away?.short_name || game.opponent || "Team");
                const homeLogo = getLogo(homeName);
                const awayLogo = getLogo(awayName);

                return (
                  <div key={game.id} style={scheduleCard}>
                    <div style={scheduleMeta}>
                      {game.division || gameInfo?.division || "Division"} • {game.time || game.event_time || "Time TBD"} • {game.field || "Field TBD"}
                    </div>

                    <div style={matchupRow}>
                      <div style={matchupTeam}>
                        {homeLogo && <img src={homeLogo} style={matchupLogo} />}
                        <div style={matchupName}>{homeName}</div>
                      </div>

                      <div style={matchupVs}>VS</div>

                      <div style={matchupTeam}>
                        {awayLogo && <img src={awayLogo} style={matchupLogo} />}
                        <div style={matchupName}>{awayName}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

    </div>
  );
}

function ToolTile({ title, desc, active, onClick }) {
  return (
    <button
      style={{
        ...toolTile,
        ...(active ? activeToolTile : {}),
      }}
      onClick={onClick}
    >
      <div style={toolTitle}>{title}</div>
      <div style={toolDesc}>{desc}</div>
    </button>
  );
}

function PreviewStat({ label, value }) {
  return (
    <div style={previewStat}>
      <div style={previewValue}>{value}</div>
      <div style={previewLabel}>{label}</div>
    </div>
  );
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

/* ================= STYLES ================= */

const toolGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 12,
  marginBottom: 12
};

const toolTile = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  cursor: "pointer",
  padding: 16,
  textAlign: "left"
};

const activeToolTile = {
  outline: "2px solid #16a34a"
};

const toolTitle = {
  fontWeight: 800
};

const toolDesc = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 4
};

const panel = {
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  marginTop: 14,
  padding: 18
};

const panelTitle = {
  marginTop: 0
};

const formGrid = {
  alignItems: "end",
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
};

const fieldGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const formLabel = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase"
};

const input = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: 10
};

const divisionSetupGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
  marginTop: 14,
  marginBottom: 14
};

const divisionSetupCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12
};

const divisionSetupTitle = {
  fontWeight: 800
};

const btn = {
  marginTop: 10,
  padding: "12px 18px",
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "600"
};

const weekBlock = {
  marginTop: 25,
  background: "#fff",
  padding: 20,
  borderRadius: 12
};

const weekHeader = {
  textAlign: "center",
  marginBottom: 15
};

const weekDateStyle = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
  marginTop: 4
};

const scheduleCardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14
};

const scheduleCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14
};

const scheduleMeta = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  textAlign: "center",
  marginBottom: 10
};

const matchupRow = {
  alignItems: "center",
  display: "grid",
  gridTemplateColumns: "1fr 42px 1fr",
  gap: 8
};

const matchupTeam = {
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0
};

const matchupLogo = {
  height: 42,
  objectFit: "contain",
  width: 42
};

const matchupName = {
  fontSize: 13,
  fontWeight: 800,
  textAlign: "center"
};

const matchupVs = {
  color: "#64748b",
  fontWeight: 900,
  textAlign: "center"
};

const statusBox = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700
};

const successBox = {
  background: "#dcfce7",
  color: "#166534"
};

const errorBox = {
  background: "#fee2e2",
  color: "#991b1b"
};

const dangerPanel = {
  alignItems: "flex-start",
  background: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: 12,
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  marginTop: 12,
  padding: 14,
  flexWrap: "wrap"
};

const dangerPreviewGrid = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  marginTop: 12,
  maxWidth: 760
};

const previewStat = {
  background: "#fff",
  border: "1px solid #fed7aa",
  borderRadius: 10,
  padding: 10
};

const previewValue = {
  color: "#9a3412",
  fontSize: 20,
  fontWeight: 900
};

const previewLabel = {
  color: "#9a3412",
  fontSize: 11,
  fontWeight: 800,
  marginTop: 2,
  textTransform: "uppercase"
};

const dangerTitle = {
  color: "#9a3412",
  fontWeight: 900
};

const dangerText = {
  color: "#9a3412",
  fontSize: 13,
  marginTop: 4
};

const dangerActions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const cancelBtn = {
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  color: "#111827",
  cursor: "pointer",
  fontWeight: 800,
  padding: "9px 12px"
};

const dangerBtn = {
  background: "#dc2626",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  padding: "9px 12px"
};

const disabledDangerBtn = {
  cursor: "not-allowed",
  opacity: 0.45
};
