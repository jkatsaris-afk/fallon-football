import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search, Shield, Users } from "lucide-react";
import { supabase } from "../../supabase";
import { applyPersonSeasonFilter, applyUuidSeasonFilter, getActiveSeason } from "../../utils/season";

import sf from "../../resources/San Francisco 49ers.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import bills from "../../resources/Buffalo Bills.png";
import broncos from "../../resources/Denver Broncos.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import colts from "../../resources/Indianapolis Colts.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import jets from "../../resources/New York Jets.png";
import lions from "../../resources/Detroit Lions.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import steelers from "../../resources/Pittsburgh Steelers.png";
import ravens from "../../resources/Baltimore Ravens.png";

const teamLogos = {
  "49ers": sf,
  Bengals: bengals,
  Bills: bills,
  Broncos: broncos,
  Chiefs: chiefs,
  Colts: colts,
  Eagles: eagles,
  Jets: jets,
  Lions: lions,
  Raiders: raiders,
  Rams: rams,
  Steelers: steelers,
  Ravens: ravens,
};

export default function SchedulePage({ setPage }) {
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [mode, setMode] = useState("week");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [selectedTeamKey, setSelectedTeamKey] = useState("all");
  const [selectedChampionshipDivision, setSelectedChampionshipDivision] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestedDate = sessionStorage.getItem("publicScheduleDate");
    const requestedType = sessionStorage.getItem("publicScheduleType");

    sessionStorage.removeItem("publicScheduleDate");
    sessionStorage.removeItem("publicScheduleType");

    load(requestedDate, requestedType);
    const interval = setInterval(() => load(null, null, true), 10000);
    return () => clearInterval(interval);
  }, []);

  const load = async (requestedDate, requestedType, silent = false) => {
    if (!silent) setLoading(true);
    const active = await getActiveSeason();
    const [
      { data: scheduleData },
      { data: teamData },
      { data: nflData },
      { data: playerData },
      { data: coachData },
    ] = await Promise.all([
      applyUuidSeasonFilter(supabase
        .from("schedule_master_auto")
        .select("*")
        .or("event_type.ilike.%game%,event_type.ilike.%champ%,event_type.ilike.%practice%")
        .order("week", { ascending: true })
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true }), active),
      applyPersonSeasonFilter(supabase.from("teams").select("*"), active),
      supabase.from("nfl_teams").select("*"),
      applyPersonSeasonFilter(supabase.from("players").select("id,first_name,last_name,team_id"), active),
      applyPersonSeasonFilter(supabase.from("coaches").select("id,first_name,last_name,email"), active),
    ]);

    setGames(scheduleData || []);
    setTeams(teamData || []);
    setNflTeams(nflData || []);
    setPlayers(playerData || []);
    setCoaches(coachData || []);

    if (requestedDate) {
      const requestedGame = (scheduleData || []).find((game) => (
        normalizeDate(game.event_date) === normalizeDate(requestedDate) &&
        (!requestedType || String(game.event_type || "").toLowerCase().includes(requestedType))
      ));
      if (requestedGame?.week) {
        setSelectedWeek(String(requestedGame.week));
        setMode("week");
      }
    }

    if (!silent) setLoading(false);
  };

  const teamCards = useMemo(() => {
    const nflById = Object.fromEntries(nflTeams.map((team) => [team.id, team]));
    return teams.map((team) => {
      const nfl = nflById[team.nfl_team_id] || {};
      const name = clean(nfl.short_name || nfl.full_name || team.name || "Team");
      const fullName = clean(nfl.full_name || nfl.short_name || name);
      const key = teamKey(name, team.division);
      return {
        id: team.id,
        key,
        name,
        fullName,
        division: normalizeDivision(team.division),
        logo: getLogo(name) || getLogo(fullName),
        coachIds: [team.coach_id, team.assistant_coach_id].filter(Boolean),
      };
    }).sort((a, b) => sortDivisions(a.division, b.division) || a.name.localeCompare(b.name));
  }, [nflTeams, teams]);

  const teamByKey = useMemo(() => (
    Object.fromEntries(teamCards.map((team) => [team.key, team]))
  ), [teamCards]);

  const playerTermsByTeam = useMemo(() => {
    const map = {};
    players.forEach((player) => {
      const team = teamCards.find((item) => item.id === player.team_id);
      if (!team) return;
      if (!map[team.key]) map[team.key] = [];
      map[team.key].push(clean(`${player.first_name || ""} ${player.last_name || ""}`).toLowerCase());
    });
    return map;
  }, [players, teamCards]);

  const coachTermsByTeam = useMemo(() => {
    const coachById = Object.fromEntries(coaches.map((coach) => [coach.id, coach]));
    const map = {};
    teamCards.forEach((team) => {
      map[team.key] = team.coachIds
        .map((id) => coachById[id])
        .filter(Boolean)
        .map((coach) => clean(`${coach.first_name || ""} ${coach.last_name || ""}`).toLowerCase());
    });
    return map;
  }, [coaches, teamCards]);

  const scheduleRows = useMemo(() => (
    games
      .filter((game) => isPublicEvent(game))
      .map((game) => ({
        ...game,
        cleanDate: normalizeDate(game.event_date),
        teamName: clean(game.team),
        opponentName: clean(game.opponent),
        teamKey: teamKey(game.team, game.division),
        opponentKey: teamKey(game.opponent, game.division),
        division: normalizeDivision(game.division),
        weekGroup: getWeekGroup(game),
      }))
      .sort((a, b) => (
        sortWeekGroup(a.weekGroup, b.weekGroup) ||
        String(a.cleanDate || "").localeCompare(String(b.cleanDate || "")) ||
        toTime(a.event_time || a.time) - toTime(b.event_time || b.time)
      ))
  ), [games]);

  const weeks = useMemo(() => {
    const byWeek = {};
    scheduleRows.forEach((game) => {
      const group = game.weekGroup;
      if (!group) return;
      if (!byWeek[group.value]) byWeek[group.value] = { label: group.label, dates: [] };
      if (game.cleanDate) byWeek[group.value].dates.push(game.cleanDate);
    });
    return Object.entries(byWeek)
      .map(([week, group]) => ({
        week,
        label: group.label,
        dateLabel: formatDateRange(group.dates),
        count: scheduleRows.filter((game) => game.weekGroup?.value === week).length,
      }))
      .sort((a, b) => sortWeekValue(a.week, b.week));
  }, [scheduleRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return scheduleRows.filter((game) => {
      const weekMatch = mode !== "week" || selectedWeek === "all" || game.weekGroup?.value === selectedWeek;
      const teamMatch = mode !== "team" || selectedTeamKey === "all" || game.teamKey === selectedTeamKey || game.opponentKey === selectedTeamKey;
      const championshipMatch = mode !== "championship" || isChampionshipEvent(game);
      const championshipDivisionMatch = mode !== "championship" || selectedChampionshipDivision === "all" || game.division === selectedChampionshipDivision;
      const searchMatch = !term || gameMatchesSearch(game, term, playerTermsByTeam, coachTermsByTeam);
      return weekMatch && teamMatch && championshipMatch && championshipDivisionMatch && searchMatch;
    });
  }, [coachTermsByTeam, mode, playerTermsByTeam, scheduleRows, search, selectedChampionshipDivision, selectedTeamKey, selectedWeek]);

  const championshipDivisions = useMemo(() => (
    ["all", ...new Set(scheduleRows.filter(isChampionshipEvent).map((game) => game.division).filter(Boolean).sort(sortDivisions))]
  ), [scheduleRows]);

  const selectedTitle = mode === "week"
    ? selectedWeek === "all" ? "All Weeks" : weeks.find((week) => week.week === selectedWeek)?.label || `Week ${selectedWeek}`
    : mode === "championship"
    ? "Championship Schedule"
    : selectedTeamKey === "all" ? "All Teams" : `${teamByKey[selectedTeamKey]?.division || ""} ${teamByKey[selectedTeamKey]?.name || "Team"}`;

  if (loading) return <div style={wrap}>Loading schedule...</div>;

  return (
    <div style={wrap}>
      <section style={hero}>
        <div>
          <div style={eyebrow}>Public Schedule</div>
          <h1 style={title}>Find Your Game</h1>
          <div style={heroText}>Search by player, coach, team, division, week, or field.</div>
        </div>
      </section>

      <div style={searchShell}>
        <Search size={19} color="#64748b" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search player, coach, team, division, field..."
          style={searchInput}
        />
      </div>

      <div style={modeGrid}>
        <ModeTile icon={<CalendarDays size={22} />} title="By Week" active={mode === "week"} onClick={() => setMode("week")} />
        <ModeTile icon={<Users size={22} />} title="By Team" active={mode === "team"} onClick={() => setMode("team")} />
        <ModeTile icon={<Shield size={22} />} title="Championship" active={mode === "championship"} onClick={() => setMode("championship")} />
      </div>

      {mode === "week" && (
        <div style={tileGrid}>
          <button style={selectorTile(selectedWeek === "all")} onClick={() => setSelectedWeek("all")}>
            <div style={tileTitle}>All Weeks</div>
            <div style={tileSub}>{scheduleRows.length} events</div>
          </button>
          {weeks.map((week) => (
            <button key={week.week} style={selectorTile(String(selectedWeek) === String(week.week))} onClick={() => setSelectedWeek(String(week.week))}>
              <div style={tileTitle}>{week.label}</div>
              <div style={tileSub}>{week.dateLabel}</div>
              <div style={tileMeta}>{week.count} events</div>
            </button>
          ))}
        </div>
      )}

      {mode === "team" && (
        <div style={tileGrid}>
          <button style={selectorTile(selectedTeamKey === "all")} onClick={() => setSelectedTeamKey("all")}>
            <div style={tileTitle}>All Teams</div>
            <div style={tileSub}>Full schedule</div>
          </button>
          {teamCards.map((team) => (
            <button key={team.key} style={selectorTile(selectedTeamKey === team.key)} onClick={() => setSelectedTeamKey(team.key)}>
              <div style={teamTileTop}>
                {team.logo && <img src={team.logo} alt="" style={teamLogo} />}
                <div>
                  <div style={tileTitle}>{team.name}</div>
                  <div style={tileSub}>{team.division}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {mode === "championship" && (
        <div style={tileGrid}>
          {championshipDivisions.map((division) => (
            <button
              key={division}
              style={selectorTile(selectedChampionshipDivision === division)}
              onClick={() => setSelectedChampionshipDivision(division)}
            >
              <div style={tileTitle}>{division === "all" ? "All Divisions" : division}</div>
              <div style={tileSub}>
                {scheduleRows.filter((game) => isChampionshipEvent(game) && (division === "all" || game.division === division)).length} games
              </div>
            </button>
          ))}
        </div>
      )}

      <section style={listCard}>
        <div style={listHeader}>
          <div>
            <div style={sectionTitle}>{selectedTitle}</div>
            <div style={sectionSub}>{filteredRows.length} schedule item{filteredRows.length === 1 ? "" : "s"}</div>
          </div>
          <button style={teamScheduleBtn} onClick={() => setPage("teamSchedules")}>Team PDFs</button>
        </div>

        {!filteredRows.length && (
          <div style={empty}>No schedule items match this search.</div>
        )}

        <div style={rows}>
          {filteredRows.map((game) => (
            <ScheduleRow key={game.id} game={game} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ModeTile({ icon, title, active, onClick }) {
  return (
    <button style={{ ...modeTile, ...(active ? activeModeTile : {}) }} onClick={onClick}>
      <div style={modeIcon}>{icon}</div>
      <div style={modeTitle}>{title}</div>
    </button>
  );
}

function ScheduleRow({ game }) {
  const homeLogo = getLogo(game.teamName);
  const awayLogo = getLogo(game.opponentName);
  const isPractice = String(game.event_type || "").toLowerCase().includes("practice");

  return (
    <article className="public-schedule-row" style={rowCard}>
      <div style={rowTime}>
        <div style={weekPill}>{game.weekGroup?.label || "Schedule"}</div>
        <div style={dateText}>{game.cleanDate ? formatShortDate(game.cleanDate) : "Date TBD"}</div>
        <div style={timeText}>{game.event_time || game.time || "Time TBD"}</div>
      </div>

      <div style={matchupBox}>
        {isPractice ? (
          <TeamLine logo={homeLogo} name={game.teamName || "Team"} />
        ) : (
          <>
            <TeamLine logo={homeLogo} name={game.teamName || "Team"} />
            <span style={vs}>vs</span>
            <TeamLine logo={awayLogo} name={game.opponentName || "Opponent"} />
          </>
        )}
      </div>

      <div style={rowMeta}>
        <div style={divisionBadge}>{game.division || "Division TBD"}</div>
        <div style={fieldText}>{game.field || "Field TBD"}</div>
        <div style={typeText}>{isPractice ? "Practice" : "Game"}</div>
      </div>
    </article>
  );
}

function TeamLine({ logo, name }) {
  return (
    <div style={teamLine}>
      {logo && <img src={logo} alt="" style={rowLogo} />}
      <span>{name}</span>
    </div>
  );
}

function gameMatchesSearch(game, term, playerTermsByTeam, coachTermsByTeam) {
  const direct = [
    game.teamName,
    game.opponentName,
    game.division,
    game.field,
    game.event_type,
    game.weekGroup?.label,
    `week ${game.week}`,
  ].join(" ").toLowerCase();

  if (direct.includes(term)) return true;

  const relatedTerms = [
    ...(playerTermsByTeam[game.teamKey] || []),
    ...(playerTermsByTeam[game.opponentKey] || []),
    ...(coachTermsByTeam[game.teamKey] || []),
    ...(coachTermsByTeam[game.opponentKey] || []),
  ];

  return relatedTerms.some((value) => value.includes(term));
}

function isPublicEvent(game) {
  const type = String(game.event_type || "").toLowerCase();
  return type.includes("game") || type.includes("champ") || type.includes("practice");
}

function isChampionshipEvent(game) {
  const type = String(game.event_type || "").toLowerCase();
  const source = String(game.source || "").toLowerCase();
  return type.includes("champ") || source.startsWith("championship");
}

function getWeekGroup(game) {
  if (isChampionshipEvent(game)) {
    return { value: "championships", label: "Championships", order: 999 };
  }

  if (game.week) {
    const week = String(game.week);
    return { value: week, label: `Week ${week}`, order: Number(game.week) || 0 };
  }

  return { value: "unscheduled", label: "Schedule", order: 1000 };
}

function sortWeekGroup(a, b) {
  return sortWeekValue(a?.value, b?.value);
}

function sortWeekValue(a, b) {
  const orderA = a === "championships" ? 999 : a === "unscheduled" ? 1000 : Number(a) || 0;
  const orderB = b === "championships" ? 999 : b === "unscheduled" ? 1000 : Number(b) || 0;
  if (orderA !== orderB) return orderA - orderB;
  return String(a || "").localeCompare(String(b || ""));
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  if (String(dateStr).includes("-")) return dateStr;
  const [m, d, y] = String(dateStr).split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function formatShortDate(dateStr) {
  const [y, m, d] = String(dateStr).split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateRange(dates) {
  const cleanDates = [...new Set(dates.filter(Boolean))].sort();
  if (!cleanDates.length) return "Date TBD";
  if (cleanDates.length === 1) return formatShortDate(cleanDates[0]);
  return `${formatShortDate(cleanDates[0])} - ${formatShortDate(cleanDates[cleanDates.length - 1])}`;
}

function toTime(timeStr) {
  if (!timeStr) return 99999;
  const [time, mod] = String(timeStr).trim().split(" ");
  let [h, m] = time.split(":").map(Number);
  if (mod === "PM" && h !== 12) h += 12;
  if (mod === "AM" && h === 12) h = 0;
  return h * 60 + (m || 0);
}

function getLogo(name) {
  if (!name) return null;
  const cleaned = clean(name);
  if (teamLogos[cleaned]) return teamLogos[cleaned];

  const lowered = cleaned.toLowerCase();
  if (lowered.includes("49")) return teamLogos["49ers"];
  if (lowered.includes("bengal")) return teamLogos.Bengals;
  if (lowered.includes("bill")) return teamLogos.Bills;
  if (lowered.includes("bronco")) return teamLogos.Broncos;
  if (lowered.includes("chief")) return teamLogos.Chiefs;
  if (lowered.includes("colt")) return teamLogos.Colts;
  if (lowered.includes("eagle")) return teamLogos.Eagles;
  if (lowered.includes("jet")) return teamLogos.Jets;
  if (lowered.includes("lion")) return teamLogos.Lions;
  if (lowered.includes("raider")) return teamLogos.Raiders;
  if (lowered.includes("ram")) return teamLogos.Rams;
  if (lowered.includes("steeler")) return teamLogos.Steelers;
  if (lowered.includes("raven")) return teamLogos.Ravens;

  return null;
}

function clean(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function teamKey(name, division) {
  return `${normalizeDivision(division)}::${clean(name).toLowerCase()}`;
}

function normalizeDivision(value) {
  const text = clean(value);
  if (!text) return "Unassigned";
  if (text.includes("K")) return "K-1st";
  if (text.includes("2") && text.includes("3")) return "2nd-3rd";
  if (text.includes("4") && text.includes("5")) return "4th-5th";
  if (text.includes("6") || text.includes("7") || text.includes("8")) return "6th-8th";
  return text;
}

function sortDivisions(a, b) {
  const order = ["K-1st", "2nd-3rd", "4th-5th", "6th-8th"];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  return String(a || "").localeCompare(String(b || ""));
}

const wrap = { display: "flex", flexDirection: "column", gap: 14, paddingBottom: 92 };
const hero = { background: "#0f172a", borderRadius: 18, color: "#fff", padding: 20 };
const eyebrow = { color: "#86efac", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const title = { fontSize: 32, fontWeight: 900, margin: "5px 0 0" };
const heroText = { color: "#d1d5db", fontSize: 14, fontWeight: 700, marginTop: 8 };
const searchShell = { alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 22px rgba(15,23,42,0.08)", display: "flex", gap: 10, padding: "11px 13px" };
const searchInput = { border: "none", flex: 1, fontSize: 16, fontWeight: 700, minWidth: 0, outline: "none" };
const modeGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" };
const modeTile = { alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 22px rgba(15,23,42,0.08)", color: "#334155", cursor: "pointer", display: "flex", gap: 10, padding: 14, textAlign: "left" };
const activeModeTile = { borderColor: "#86efac", color: "#166534" };
const modeIcon = { alignItems: "center", background: "#ecfdf5", borderRadius: 12, display: "flex", height: 40, justifyContent: "center", width: 40 };
const modeTitle = { fontSize: 15, fontWeight: 900 };
const tileGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))" };
const selectorTile = (active) => ({ background: "#fff", border: `1px solid ${active ? "#86efac" : "#e2e8f0"}`, borderRadius: 16, boxShadow: active ? "0 12px 24px rgba(22,101,52,0.14)" : "0 8px 22px rgba(15,23,42,0.08)", color: "#0f172a", cursor: "pointer", minHeight: 86, padding: 14, textAlign: "left" });
const tileTitle = { fontSize: 15, fontWeight: 900 };
const tileSub = { color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 4 };
const tileMeta = { color: "#166534", fontSize: 12, fontWeight: 900, marginTop: 6 };
const teamTileTop = { alignItems: "center", display: "flex", gap: 9 };
const teamLogo = { height: 34, objectFit: "contain", width: 34 };
const listCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", overflow: "hidden" };
const listHeader = { alignItems: "center", borderBottom: "1px solid #e2e8f0", display: "flex", gap: 12, justifyContent: "space-between", padding: 16 };
const sectionTitle = { color: "#0f172a", fontSize: 20, fontWeight: 900 };
const sectionSub = { color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 3 };
const teamScheduleBtn = { background: "#166534", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontWeight: 900, padding: "10px 12px", whiteSpace: "nowrap" };
const rows = { display: "grid" };
const rowCard = { alignItems: "center", borderBottom: "1px solid #e2e8f0", display: "grid", gap: 12, gridTemplateColumns: "115px minmax(0, 1fr) 150px", padding: 14 };
const rowTime = { display: "grid", gap: 4 };
const weekPill = { background: "#ecfdf5", borderRadius: 999, color: "#166534", fontSize: 11, fontWeight: 900, justifySelf: "start", padding: "4px 8px" };
const dateText = { color: "#0f172a", fontSize: 14, fontWeight: 900 };
const timeText = { color: "#64748b", fontSize: 12, fontWeight: 800 };
const matchupBox = { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, minWidth: 0 };
const teamLine = { alignItems: "center", display: "flex", fontSize: 16, fontWeight: 900, gap: 8, minWidth: 0 };
const rowLogo = { height: 34, objectFit: "contain", width: 34 };
const vs = { color: "#94a3b8", fontSize: 11, fontWeight: 900, textTransform: "uppercase" };
const rowMeta = { display: "grid", gap: 5, justifyItems: "end" };
const divisionBadge = { background: "#f1f5f9", borderRadius: 999, color: "#334155", fontSize: 11, fontWeight: 900, padding: "5px 9px", textAlign: "center" };
const fieldText = { color: "#0f172a", fontSize: 13, fontWeight: 900 };
const typeText = { color: "#64748b", fontSize: 11, fontWeight: 800, textTransform: "uppercase" };
const empty = { color: "#64748b", fontWeight: 800, padding: 22, textAlign: "center" };
