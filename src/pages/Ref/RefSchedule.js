import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

/* LOGOS */
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
  steelers, "49ers": niners, ravens
};

export default function RefSchedule() {
  const [games, setGames] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const parseGameDate = (dateStr, timeStr) => {
    if (!dateStr) return null;

    const [y, m, d] = dateStr.split("-");
    let hour = 0;
    let minute = 0;

    if (timeStr) {
      const parts = timeStr.split(":");
      hour = parseInt(parts[0]) || 0;
      minute = parseInt(parts[1]) || 0;
    }

    return new Date(y, m - 1, d, hour, minute);
  };

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data: ref } = await supabase
      .from("referees")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!ref) return;

    const { data: assignments } = await supabase
      .from("ref_assignments")
      .select(`
        *,
        schedule_master_auto (
          id,
          division,
          team,
          opponent,
          event_date,
          event_time,
          field
        )
      `)
      .eq("referee_id", ref.id);

    const now = new Date();

    const upcoming = (assignments || []).filter((g) => {
      const game = g.schedule_master_auto;
      const gameDate = parseGameDate(game?.event_date, game?.event_time);
      if (!gameDate) return false;
      return gameDate >= now;
    });

    upcoming.sort((a, b) => {
      const g1 = parseGameDate(a.schedule_master_auto.event_date, a.schedule_master_auto.event_time);
      const g2 = parseGameDate(b.schedule_master_auto.event_date, b.schedule_master_auto.event_time);
      return g1 - g2;
    });

    setGames(upcoming);
  };

  const getLogo = (team) => {
    if (!team) return null;
    return teamLogos[team.toLowerCase().trim()];
  };

  const isToday = (dateStr) => {
    const today = new Date();
    const d = new Date(dateStr);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  return (
    <div style={wrap}>
      <h2 style={title}>Upcoming Games</h2>

      {games.length === 0 && (
        <div style={empty}>No upcoming games</div>
      )}

      <div style={grid}>
        {games.map((g, index) => {
          const game = g.schedule_master_auto;
          if (!game) return null;

          const teamLogo = getLogo(game.team);
          const oppLogo = getLogo(game.opponent);

          const nextGame = index === 0;

          return (
            <div
              key={g.id}
              style={{
                ...card,
                ...(nextGame && nextGameHighlight)
              }}
            >

              {/* BADGES */}
              <div style={badgeRow}>
                {nextGame && <div style={nextBadge}>NEXT</div>}
                {isToday(game.event_date) && <div style={todayBadge}>TODAY</div>}
              </div>

              {/* TEAMS */}
              <div style={teamsRow}>
                <div style={teamBlock}>
                  {teamLogo && <img src={teamLogo} style={logoStyle} />}
                  <div style={teamName}>{game.team}</div>
                </div>

                <div style={vsBig}>vs</div>

                <div style={teamBlock}>
                  {oppLogo && <img src={oppLogo} style={logoStyle} />}
                  <div style={teamName}>{game.opponent}</div>
                </div>
              </div>

              {/* INFO */}
              <div style={infoStack}>
                <div style={timeBar}>
                  {game.event_date} • {game.event_time}
                </div>
                <div style={fieldBar}>
                  Field {game.field}
                </div>
                <div style={divisionBar}>
                  {game.division}
                </div>
              </div>

              {/* ROLE */}
              <div style={roleTile}>
                {g.role}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

/* STYLES */

const wrap = { padding: 20 };
const title = { fontSize: 20, fontWeight: 700, marginBottom: 16 };
const empty = { color: "#64748b" };

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
  gap: 12
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const nextGameHighlight = {
  border: "2px solid #16a34a"
};

const badgeRow = {
  display: "flex",
  gap: 6
};

const nextBadge = {
  background: "#16a34a",
  color: "#fff",
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 11
};

const todayBadge = {
  background: "#facc15",
  padding: "4px 8px",
  borderRadius: 6,
  fontSize: 11
};

const teamsRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const teamBlock = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  flex: 1
};

const teamName = {
  fontWeight: 700,
  fontSize: 13,
  textAlign: "center"
};

const logoStyle = { width: 60 };
const vsBig = { fontWeight: 800, color: "#64748b" };

const infoStack = {
  display: "flex",
  flexDirection: "column",
  gap: 6
};

const pillBase = {
  width: "100%",
  padding: "10px",
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
  boxSizing: "border-box"
};

const timeBar = { ...pillBase, background: "#e0f2fe", color: "#0369a1" };
const fieldBar = { ...pillBase, background: "#dcfce7", color: "#166534" };
const divisionBar = { ...pillBase, background: "#fef9c3", color: "#854d0e" };

const roleTile = {
  marginTop: 8,
  background: "#f1f5f9",
  padding: "10px",
  borderRadius: 12,
  textAlign: "center",
  fontWeight: 700,
  color: "#334155"
};
