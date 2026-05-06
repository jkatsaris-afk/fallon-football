import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

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
  const [matchups, setMatchups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [status, setStatus] = useState(null);
  const [activeTool, setActiveTool] = useState("overview");
  const [weekToSchedule, setWeekToSchedule] = useState("");
  const [weekDate, setWeekDate] = useState("");
  const [championshipDate, setChampionshipDate] = useState("");
  const [championshipWeek, setChampionshipWeek] = useState(9);
  const [championshipSeeds, setChampionshipSeeds] = useState({});

  const TABLE = "schedule_master_auto";

  useEffect(() => {
    loadAll();
  }, []);

  /* ================= LOAD ================= */

  const loadAll = async () => {
    const { data: s } = await supabase.from(TABLE).select("*");

    const { data: f } = await supabase
      .from("fields")
      .select("*")
      .order("field_number");

    const { data: m } = await supabase.from("matchups").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: slots } = await supabase.from("field_time_slots").select("*");

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
      const validTimes = getGameTimeSlots();

      if (!validFields.length || !validTimes.length) return;

      const divisionIndex = gameIndexByDivision[game.division] || 0;
      const field = validFields[divisionIndex % validFields.length];
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
        source: "auto"
      });

      gameIndexByDivision[game.division] = divisionIndex + 1;
    });

    return rows;
  };

  const generateSchedule = async () => {
    setStatus(null);

    const { data: existingSchedule } = await supabase.from(TABLE).select("week,event_date");

    if (!matchups?.length) {
      setStatus({ type: "error", message: "No matchups found in the database." });
      return;
    }

    if (!fields?.length) {
      setStatus({ type: "error", message: "No fields found in the database." });
      return;
    }
    if (!timeSlots?.length) {
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

    const { error } = await supabase.from(TABLE).insert(insert);

    if (error) {
      console.error(error);
      setStatus({ type: "error", message: "Schedule insert failed. Check the console for details." });
      return;
    }

    setStatus({ type: "success", message: "Schedule generated from database matchups." });
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

    await supabase.from(TABLE).delete().eq("week", weekToSchedule);
    const { error } = await supabase.from(TABLE).insert(rows);

    if (error) {
      console.error("Week schedule insert error:", error);
      setStatus({ type: "error", message: "Could not schedule this week. Check the console for details." });
      return;
    }

    setStatus({ type: "success", message: `Week ${weekToSchedule} scheduled.` });
    await loadAll();
  };

  const createChampionshipGames = async () => {
    setStatus(null);

    if (!championshipDate) {
      setStatus({ type: "error", message: "Set a championship date before creating games." });
      return;
    }

    const rows = divisions.flatMap((division) => {
      const setup = championshipSeeds[division] || {};
      const homeTeam = teams.find((team) => team.id === setup.seed1);
      const awayTeam = teams.find((team) => team.id === setup.seed2);
      const field = allFields.find((item) => item.id === setup.fieldId);
      const time = setup.time;
      const homeNFL = nflTeams.find((team) => team.id === homeTeam?.nfl_team_id);
      const awayNFL = nflTeams.find((team) => team.id === awayTeam?.nfl_team_id);

      if (!homeTeam || !awayTeam || !field || !time) return [];

      return [{
        week: championshipWeek,
        field_id: field.id,
        time,
        event_time: time,
        field: field.name,
        event_date: championshipDate,
        division,
        team: homeNFL?.short_name || homeNFL?.full_name || null,
        opponent: awayNFL?.short_name || awayNFL?.full_name || null,
        event_type: "championship game",
        source: "championship"
      }];
    });

    if (!rows.length) {
      setStatus({ type: "error", message: "Set seeds, fields, and times for at least one division." });
      return;
    }

    await supabase
      .from(TABLE)
      .delete()
      .eq("week", championshipWeek)
      .ilike("event_type", "%champ%");

    const { error } = await supabase.from(TABLE).insert(rows);

    if (error) {
      console.error("Championship insert error:", error);
      setStatus({ type: "error", message: "Could not create championship games. Check the console for details." });
      return;
    }

    setStatus({ type: "success", message: "Championship games created." });
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

  const weeks = [...new Set(schedule.map(s => s.week))].sort((a, b) => Number(a) - Number(b));
  const matchupWeeks = [...new Set(matchups.map((matchup) => matchup.week))]
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b));
  const divisions = [...new Set([
    ...matchups.map((matchup) => matchup.division),
    ...teams.map((team) => team.division),
  ].filter(Boolean))].sort((a, b) => {
    if (a === "K-1") return -1;
    if (b === "K-1") return 1;
    return a.localeCompare(b);
  });
  const championshipFields = allFields.filter((field) => (
    (field.season_phase || "regular") === "championship" &&
    field.type === "game"
  ));
  const championshipFieldPool = championshipFields.length ? championshipFields : fields;
  const gameTimes = getGameTimeSlots();

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
    const key = teamName.toString().trim().toLowerCase();
    if (key.includes("49")) return teamLogos["49ers"];
    return teamLogos[key] || null;
  };

  const getTeamLabel = (team) => {
    const nfl = nflTeams.find((item) => item.id === team?.nfl_team_id);
    return nfl?.short_name || nfl?.full_name || "Team";
  };

  const getTeamsForDivision = (division) => (
    teams.filter((team) => team.division === division)
  );

  const setChampionshipSeed = (division, field, value) => {
    setChampionshipSeeds((prev) => ({
      ...prev,
      [division]: {
        ...(prev[division] || {}),
        [field]: value,
      },
    }));
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
          title="Championship Creator"
          desc="Set seeds, fields, and times"
          active={activeTool === "championship"}
          onClick={() => setActiveTool("championship")}
        />
        <ToolTile
          title="Regenerate Season"
          desc="Rebuild all weeks from matchups"
          active={false}
          onClick={generateSchedule}
        />
      </div>

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

      {activeTool === "championship" && (
        <div style={panel}>
          <h2 style={panelTitle}>Championship Creator</h2>
          <div style={formGrid}>
            <label style={fieldGroup}>
              <span style={formLabel}>Championship Week</span>
              <input style={input} type="number" value={championshipWeek} onChange={(e) => setChampionshipWeek(Number(e.target.value))} />
            </label>
            <label style={fieldGroup}>
              <span style={formLabel}>Championship Date</span>
              <input style={input} type="date" value={championshipDate} onChange={(e) => setChampionshipDate(e.target.value)} />
            </label>
          </div>

          <div style={divisionSetupGrid}>
            {divisions.map((division) => {
              const divisionTeams = getTeamsForDivision(division);
              const setup = championshipSeeds[division] || {};
              const divisionFields = championshipFieldPool.filter((field) => !field.division || field.division === division);

              return (
                <div key={division} style={divisionSetupCard}>
                  <div style={divisionSetupTitle}>{division}</div>
                  <label style={fieldGroup}>
                    <span style={formLabel}>Seed 1</span>
                    <select style={input} value={setup.seed1 || ""} onChange={(e) => setChampionshipSeed(division, "seed1", e.target.value)}>
                      <option value="">Select team</option>
                      {divisionTeams.map((team) => (
                        <option key={team.id} value={team.id}>{getTeamLabel(team)}</option>
                      ))}
                    </select>
                  </label>
                  <label style={fieldGroup}>
                    <span style={formLabel}>Seed 2</span>
                    <select style={input} value={setup.seed2 || ""} onChange={(e) => setChampionshipSeed(division, "seed2", e.target.value)}>
                      <option value="">Select team</option>
                      {divisionTeams.map((team) => (
                        <option key={team.id} value={team.id}>{getTeamLabel(team)}</option>
                      ))}
                    </select>
                  </label>
                  <label style={fieldGroup}>
                    <span style={formLabel}>Field</span>
                    <select style={input} value={setup.fieldId || ""} onChange={(e) => setChampionshipSeed(division, "fieldId", e.target.value)}>
                      <option value="">Select field</option>
                      {divisionFields.map((field) => (
                        <option key={field.id} value={field.id}>{field.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={fieldGroup}>
                    <span style={formLabel}>Time</span>
                    <select style={input} value={setup.time || ""} onChange={(e) => setChampionshipSeed(division, "time", e.target.value)}>
                      <option value="">Select time</option>
                      {gameTimes.map((slot) => (
                        <option key={slot.id} value={slot.time}>{slot.time}</option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>

          <button style={btn} onClick={createChampionshipGames}>Create Championship Games</button>
        </div>
      )}

      {weeks.map(week => {
        const weekGames = schedule
          .filter(s => s.week === week)
          .sort((a, b) => timeToMinutes(a.time || a.event_time) - timeToMinutes(b.time || b.event_time));

        return (
          <section key={week} style={weekBlock}>
            <h2 style={weekHeader}>
              Week {week}
              {getWeekDateRange(week) && (
                <div style={weekDate}>{getWeekDateRange(week)}</div>
              )}
            </h2>

            <div style={scheduleCardGrid}>
              {weekGames.map((game) => {
                const gameInfo = getGame(game);
                const homeName = gameInfo?.home?.short_name || game.team || "Team";
                const awayName = gameInfo?.away?.short_name || game.opponent || "Team";
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

const weekDate = {
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

const grid = {
  display: "grid",
  gap: 6,
  marginBottom: 6
};

const fieldHeader = (type) => ({
  textAlign: "center",
  fontWeight: "600",
  color: type === "practice" ? "#64748b" : "#000"
});

const fieldSub = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 500,
  marginTop: 2
};

const timeCell = {
  fontWeight: "600"
};

const cell = {
  border: "1px solid #ddd",
  borderRadius: 6,
  padding: 5,
  minHeight: 80
};

const tile = {
  background: "#f8fafc",
  borderRadius: 8,
  padding: 6,
  textAlign: "center"
};

const divisionTextStyle = {
  fontSize: 10,
  color: "#64748b"
};

const teamsRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const teamCellStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "40%"
};

const teamLogoStyle = {
  width: 26,
  height: 26
};

const vs = {
  fontWeight: "700"
};
