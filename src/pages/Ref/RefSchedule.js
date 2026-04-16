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
  const [refId, setRefId] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    load();
  }, []);

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

    setRefId(ref.id);

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

    setGames(assignments || []);
  };

  const getLogo = (team) => {
    if (!team) return null;
    return teamLogos[team.toLowerCase().trim()];
  };

  return (
    <div style={wrap}>
      <h2 style={title}>My Schedule</h2>

      {games.length === 0 && (
        <div style={empty}>No games assigned</div>
      )}

      <div style={grid}>
        {games.map((g) => {
          const game = g.schedule_master_auto;
          if (!game) return null;

          const teamLogo = getLogo(game.team);
          const oppLogo = getLogo(game.opponent);

          return (
            <div key={g.id} style={card}>

              {/* 🔥 BIG CENTER LOGOS */}
              <div style={logoRow}>
                {teamLogo && <img src={teamLogo} style={logoStyle} />}
                <div style={vsBig}>vs</div>
                {oppLogo && <img src={oppLogo} style={logoStyle} />}
              </div>

              {/* 🔥 TEAM NAMES */}
              <div style={teamsRow}>
                <div style={team}>{game.team}</div>
                <div style={team}>{game.opponent}</div>
              </div>

              {/* 🔥 INFO STACK */}
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

              {/* 🔥 ROLE TILE */}
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

/* ---------------- STYLES ---------------- */

const wrap = {
  padding: 20
};

const title = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 16
};

const empty = {
  color: "#64748b"
};

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

/* 🔥 LOGOS */
const logoRow = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 16
};

const logoStyle = {
  width: 60
};

const vsBig = {
  fontWeight: 800,
  fontSize: 16,
  color: "#64748b"
};

/* 🔥 TEAM NAMES */
const teamsRow = {
  display: "flex",
  justifyContent: "space-between"
};

const team = {
  fontWeight: 700,
  fontSize: 14
};

/* 🔥 INFO STACK */
const infoStack = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 6
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

const timeBar = {
  ...pillBase,
  background: "#e0f2fe",
  color: "#0369a1"
};

const fieldBar = {
  ...pillBase,
  background: "#dcfce7",
  color: "#166534"
};

const divisionBar = {
  ...pillBase,
  background: "#fef9c3",
  color: "#854d0e"
};

/* 🔥 ROLE TILE */
const roleTile = {
  marginTop: 8,
  background: "#f1f5f9",
  padding: "10px",
  borderRadius: 12,
  textAlign: "center",
  fontWeight: 700,
  color: "#334155"
};
