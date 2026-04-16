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
  const [allGames, setAllGames] = useState([]); // 🔥 NEW

  useEffect(() => {
    load();
  }, []);

  // 🔥 LIVE UPDATE EVERY MINUTE
  useEffect(() => {
    const interval = setInterval(() => {
      filterGames();
    }, 60000);

    return () => clearInterval(interval);
  }, [allGames]);

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

  const filterGames = () => {
    const now = new Date();

    const upcoming = (allGames || []).filter((g) => {
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

    setAllGames(assignments || []);

    // 🔥 run immediately
    setTimeout(() => filterGames(), 0);
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

              <div style={badgeRow}>
                {nextGame && <div style={nextBadge}>NEXT</div>}
                {isToday(game.event_date) && <div style={todayBadge}>TODAY</div>}
              </div>

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
