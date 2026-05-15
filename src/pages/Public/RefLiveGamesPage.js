import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];

export default function RefLiveGamesPage() {
  const [liveGames, setLiveGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveGames();
    const interval = setInterval(loadLiveGames, 2500);
    return () => clearInterval(interval);
  }, []);

  const loadLiveGames = async () => {
    const { data } = await supabase
      .from("games_live")
      .select("*")
      .in("status", LIVE_GAME_STATUSES)
      .order("created_at", { ascending: false });

    const scheduleIds = [...new Set((data || []).map((game) => game.schedule_id).filter(Boolean))];
    let scheduleById = {};

    if (scheduleIds.length) {
      const { data: schedules } = await supabase
        .from("schedule_master_auto")
        .select("*")
        .in("id", scheduleIds);

      (schedules || []).forEach((game) => {
        scheduleById[game.id] = game;
      });
    }

    setLiveGames((data || [])
      .map((game) => ({ ...game, schedule: scheduleById[game.schedule_id] }))
      .filter((game) => game.schedule));
    setLoading(false);
  };

  return (
    <div style={page}>
      <div style={header}>
        <div style={eyebrow}>Ref Display</div>
        <div style={title}>Live Games</div>
      </div>

      {loading && <div style={empty}>Loading live games...</div>}

      {!loading && !liveGames.length && (
        <div style={empty}>No live games right now.</div>
      )}

      <div style={list}>
        {liveGames.map((liveGame) => {
          const game = liveGame.schedule;
          const href = `/field-scoreboard/${game.field_id}/display/ref`;

          return (
            <a key={liveGame.id} href={href} style={card}>
              <div style={cardTop}>
                <div>
                  <div style={field}>{game.field || "Field"}</div>
                  <div style={matchup}>{clean(game.team)} vs {clean(game.opponent)}</div>
                </div>
                <div style={clock}>{liveGame.clock || "0:00"}</div>
              </div>
              <div style={score}>
                <span>{Number(liveGame.home_score || 0)}</span>
                <span style={dash}>-</span>
                <span>{Number(liveGame.away_score || 0)}</span>
              </div>
              <div style={meta}>
                <span>{getStatusLabel(liveGame.status)}</span>
                <span>{game.division || "Division TBD"}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function clean(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function getStatusLabel(status) {
  if (status === "halftime") return "Halftime";
  if (status === "timeout_home") return "Home timeout";
  if (status === "timeout_away") return "Away timeout";
  if (status === "final_display") return "Final";
  return "Live";
}

const page = { background: "#f8fafc", boxSizing: "border-box", minHeight: "100dvh", padding: "max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom))" };
const header = { marginBottom: 18 };
const eyebrow = { color: "#2563eb", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const title = { color: "#0f172a", fontSize: 38, fontWeight: 900, lineHeight: 0.95, marginTop: 4 };
const list = { display: "grid", gap: 12 };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 8px 18px rgba(15,23,42,0.06)", boxSizing: "border-box", color: "#0f172a", display: "block", padding: 16, textDecoration: "none" };
const cardTop = { alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" };
const field = { color: "#64748b", fontSize: 13, fontWeight: 900, textTransform: "uppercase" };
const matchup = { color: "#0f172a", fontSize: 22, fontWeight: 900, lineHeight: 1, marginTop: 5, overflowWrap: "anywhere" };
const clock = { color: "#111827", fontSize: 32, fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.9, textAlign: "right" };
const score = { alignItems: "center", color: "#111827", display: "flex", fontSize: 62, fontVariantNumeric: "tabular-nums", fontWeight: 900, gap: 12, justifyContent: "center", lineHeight: 0.85, marginTop: 18 };
const dash = { color: "#94a3b8", fontSize: 36 };
const meta = { color: "#64748b", display: "flex", fontSize: 15, fontWeight: 900, justifyContent: "space-between", marginTop: 14, textTransform: "uppercase" };
const empty = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, color: "#64748b", fontSize: 22, fontWeight: 900, padding: 24, textAlign: "center" };
