import { useEffect, useMemo, useState } from "react";
import { Calendar, ClipboardList, Radio, Trophy, UserPlus } from "lucide-react";
import { supabase } from "../../supabase";

const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];

export default function HomePage({ setPage }) {
  const [games, setGames] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [settings, setSettings] = useState(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    loadHomeData();
    const refresh = setInterval(loadHomeData, 30000);
    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  const loadHomeData = async () => {
    const [{ data: scheduleData }, { data: liveData }, { data: settingsData }] = await Promise.all([
      supabase
        .from("schedule_master_auto")
        .select("*")
        .ilike("event_type", "%game%")
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true }),
      supabase
        .from("games_live")
        .select("*")
        .in("status", LIVE_GAME_STATUSES)
        .order("created_at", { ascending: false }),
      supabase
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),
    ]);

    setGames(scheduleData || []);
    setLiveGames(liveData || []);
    setSettings(settingsData || {});
  };

  const upcomingGames = useMemo(() => (
    games
      .map((game) => ({ ...game, startsAt: getGameDate(game) }))
      .filter((game) => game.startsAt && game.startsAt >= now)
      .sort((a, b) => a.startsAt - b.startsAt)
  ), [games, now]);

  const nextGame = upcomingGames[0];
  const nextGameCount = nextGame
    ? upcomingGames.filter((game) => isSameWeek(game, nextGame)).length
    : 0;
  const scoreboardsOpen = settings?.live_scoreboards_open !== false;

  const openUpcomingGames = () => {
    if (nextGame?.event_date) {
      sessionStorage.setItem("publicScheduleDate", nextGame.event_date);
      sessionStorage.setItem("publicScheduleType", "game");
    }
    setPage("schedule");
  };

  const openLiveScoreboard = () => {
    sessionStorage.setItem("publicScoreboardView", "live");
    setPage("scoreboard");
  };

  const openFullSchedule = () => {
    sessionStorage.removeItem("publicScheduleDate");
    sessionStorage.removeItem("publicScheduleType");
    setPage("schedule");
  };

  return (
    <div style={wrap}>
      <section style={hero}>
        <div>
          <div style={eyebrow}>Fallon Flag Football</div>
          <h1 style={title}>2026 Season</h1>
          <p style={heroText}>Schedules, scores, signups, and live game updates for families and fans.</p>
        </div>
        <div style={seasonBadge}>Public Hub</div>
      </section>

      <section style={statusGrid}>
        <button type="button" style={statusTile} onClick={openLiveScoreboard}>
          <div style={statusIcon}><Radio size={20} /></div>
          <div>
            <div style={statusTitle}>Live Games</div>
            <div style={statusSub}>
              {liveGames.length} live now • {scoreboardsOpen ? "Scoreboard ready" : "Scoreboard off"}
            </div>
          </div>
        </button>

        <button type="button" style={statusTile} onClick={openUpcomingGames}>
          <div style={statusIcon}><Calendar size={20} /></div>
          <div>
            <div style={statusTitle}>{nextGame ? formatShortDate(nextGame.event_date) : "Schedule"}</div>
            <div style={statusSub}>
              {nextGame ? `${nextGameCount} upcoming game${nextGameCount === 1 ? "" : "s"}` : "View season schedule"}
            </div>
          </div>
        </button>
      </section>

      {nextGame && (
        <section style={nextPanel}>
          <div style={nextTop}>
            <div>
              <div style={sectionLabel}>Next Game</div>
              <div style={matchup}>{clean(nextGame.team)} vs {clean(nextGame.opponent)}</div>
            </div>
            <div style={timeBadge}>{nextGame.event_time || nextGame.time || "TBD"}</div>
          </div>
          <div style={nextMeta}>
            {nextGame.division || "Division TBD"} • {nextGame.field || "Field TBD"} • {getCountdown(nextGame.startsAt, now)}
          </div>
        </section>
      )}

      <section style={quickGrid}>
        <QuickTile icon={<Calendar size={22} />} title="Schedule" text="Find games by week, team, and field." onClick={openFullSchedule} />
        <QuickTile icon={<Trophy size={22} />} title="Scores" text="Search finals and live games." onClick={() => setPage("scoreboard")} />
        <QuickTile icon={<UserPlus size={22} />} title="Sign Up" text="Player, coach, and referee forms." onClick={() => window.location.href = "/signup"} />
        <QuickTile icon={<ClipboardList size={22} />} title="Coach Rankings" text="Public player ranking form." onClick={() => window.location.href = "/coach-rankings"} />
      </section>

      <section style={infoPanel}>
        <div style={sectionLabel}>Game Day</div>
        <div style={infoList}>
          <InfoRow label="Check scores" value="Open Scores for live and final results." />
          <InfoRow label="Find your field" value="Open Schedule and filter by team or week." />
          <InfoRow label="Need help" value="Use the Login menu for coach, parent, referee, or league access." />
        </div>
      </section>
    </div>
  );
}

function QuickTile({ icon, title, text, onClick }) {
  return (
    <button type="button" style={quickTile} onClick={onClick}>
      <div style={quickIcon}>{icon}</div>
      <div style={quickTitle}>{title}</div>
      <div style={quickText}>{text}</div>
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={infoRow}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>{value}</div>
    </div>
  );
}

function getGameDate(game) {
  if (!game?.event_date) return null;
  const [year, month, day] = String(game.event_date).split("-").map(Number);
  const [hour, minute] = parseTime(game.event_time || game.time);
  return new Date(year, Number(month || 1) - 1, day || 1, hour, minute);
}

function parseTime(value) {
  const cleanValue = (value || "").toString().trim();
  const match = cleanValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return [0, 0];
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return [hour, minute];
}

function isSameWeek(game, nextGame) {
  return String(game.week || "") === String(nextGame.week || "") && game.event_date === nextGame.event_date;
}

function getCountdown(date, now) {
  if (!date) return "Date TBD";
  const diff = date - now;
  if (diff <= 0) return "Starts soon";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h`;
  return "today";
}

function formatShortDate(value) {
  if (!value) return "TBD";
  const [year, month, day] = String(value).split("-").map(Number);
  const date = new Date(year, Number(month || 1) - 1, day || 1);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function clean(value) {
  return (value || "TBD").toString().replace(/\s+/g, " ").trim();
}

const wrap = { display: "flex", flexDirection: "column", gap: 12 };
const hero = { alignItems: "flex-start", background: "#0f172a", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.16)", color: "#fff", display: "flex", gap: 14, justifyContent: "space-between", padding: 20 };
const eyebrow = { color: "#86efac", fontSize: 12, fontWeight: 900, letterSpacing: 0, textTransform: "uppercase" };
const title = { fontSize: 32, fontWeight: 900, lineHeight: 1, margin: "6px 0 0" };
const heroText = { color: "#d1d5db", fontSize: 14, fontWeight: 700, lineHeight: 1.35, margin: "10px 0 0" };
const seasonBadge = { background: "#16a34a", borderRadius: 999, color: "#fff", flex: "0 0 auto", fontSize: 12, fontWeight: 900, padding: "7px 10px" };
const statusGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };
const statusTile = { alignItems: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.05)", color: "#111827", cursor: "pointer", display: "flex", gap: 10, minHeight: 78, padding: 12, textAlign: "left" };
const statusIcon = { alignItems: "center", background: "#ecfdf5", borderRadius: 12, color: "#0f7a3b", display: "flex", flex: "0 0 40px", height: 40, justifyContent: "center" };
const statusTitle = { fontSize: 15, fontWeight: 900, lineHeight: 1.1 };
const statusSub = { color: "#64748b", fontSize: 12, fontWeight: 700, lineHeight: 1.2, marginTop: 3 };
const nextPanel = { background: "#fff", border: "1px solid #e5e7eb", borderLeft: "4px solid #0f7a3b", borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.05)", padding: 14 };
const nextTop = { alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" };
const sectionLabel = { color: "#0f7a3b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const matchup = { color: "#111827", fontSize: 19, fontWeight: 900, lineHeight: 1.05, marginTop: 5 };
const timeBadge = { background: "#f1f5f9", borderRadius: 999, color: "#0f172a", flex: "0 0 auto", fontSize: 12, fontWeight: 900, padding: "7px 10px" };
const nextMeta = { color: "#64748b", fontSize: 13, fontWeight: 800, lineHeight: 1.25, marginTop: 10 };
const quickGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };
const quickTile = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.05)", color: "#111827", cursor: "pointer", minHeight: 132, padding: 14, textAlign: "left" };
const quickIcon = { alignItems: "center", background: "#f1f5f9", borderRadius: 12, color: "#0f7a3b", display: "flex", height: 40, justifyContent: "center", width: 40 };
const quickTitle = { fontSize: 17, fontWeight: 900, marginTop: 12 };
const quickText = { color: "#64748b", fontSize: 12, fontWeight: 700, lineHeight: 1.3, marginTop: 5 };
const infoPanel = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.05)", padding: 14 };
const infoList = { display: "grid", gap: 10, marginTop: 10 };
const infoRow = { display: "grid", gap: 3 };
const infoLabel = { color: "#111827", fontSize: 13, fontWeight: 900 };
const infoValue = { color: "#64748b", fontSize: 12, fontWeight: 700, lineHeight: 1.35 };
