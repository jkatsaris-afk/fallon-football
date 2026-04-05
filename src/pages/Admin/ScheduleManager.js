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
  const [matchups, setMatchups] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [mode, setMode] = useState("test");

  const TABLE = mode === "test" ? "schedule_test" : "schedule_master";

  useEffect(() => {
    loadAll();
  }, [mode]);

  /* ================= LOAD ================= */

  const loadAll = async () => {
    const { data: s } = await supabase.from(TABLE).select("*");
    const { data: f } = await supabase
      .from("fields")
      .select("*")
      .eq("type", "game") // 🔥 ONLY GAME FIELDS
      .order("field_number");

    const { data: m } = await supabase.from("matchups").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: nfl } = await supabase.from("nfl_teams").select("*");

    setSchedule(s || []);
    setFields(f || []);
    setMatchups(m || []);
    setTeams(t || []);
    setNflTeams(nfl || []);
  };

  /* ================= HELPERS ================= */

  const getGame = (matchupId) => {
    const m = matchups.find(x => x.id === matchupId);
    if (!m) return null;

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

  const weeks = [...new Set(schedule.map(s => s.week))];

  return (
    <div>

      <h1>Schedule Manager</h1>

      {/* TOGGLE */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setMode("test")}>Test</button>
        <button onClick={() => setMode("live")}>Live</button>
      </div>

      {/* ================= SCHEDULE ================= */}

      {weeks.map(week => {
        const weekGames = schedule.filter(s => s.week === week);
        const times = [...new Set(weekGames.map(g => g.time))];

        return (
          <div key={week} style={weekBlock}>

            <h2 style={weekHeader}>Week {week}</h2>

            {/* TABLE HEADER */}
            <div style={gridHeader}>
              <div style={timeHeader}></div>

              {fields.map(field => (
                <div key={field.id} style={fieldHeader}>
                  {field.name}
                </div>
              ))}
            </div>

            {/* TABLE BODY */}
            {times.map(time => (
              <div key={time} style={gridRow}>

                {/* TIME COLUMN */}
                <div style={timeCell}>{time}</div>

                {/* FIELD CELLS */}
                {fields.map(field => {
                  const game = weekGames.find(
                    g => g.time === time && g.field_id === field.id
                  );

                  if (!game) return <div style={cell} />;

                  const g = getGame(game.matchup_id);
                  if (!g) return <div style={cell} />;

                  return (
                    <div style={cell}>

                      <div style={gameTile}>
                        <div style={division}>{g.division}</div>

                        <div style={teamsRow}>
                          <div style={team}>
                            <img src={teamLogos[g.home?.short_name]} style={logo}/>
                            <div>{g.home?.short_name}</div>
                          </div>

                          <div style={vs}>VS</div>

                          <div style={team}>
                            <img src={teamLogos[g.away?.short_name]} style={logo}/>
                            <div>{g.away?.short_name}</div>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}

              </div>
            ))}

          </div>
        );
      })}

    </div>
  );
}

/* ================= STYLES ================= */

const weekBlock = {
  marginTop: 30,
  padding: 15,
  background: "#fff",
  borderRadius: 12
};

const weekHeader = {
  textAlign: "center",
  marginBottom: 15
};

/* GRID */

const gridHeader = {
  display: "grid",
  gridTemplateColumns: "120px repeat(3, 1fr)",
  fontWeight: "600",
  marginBottom: 10
};

const gridRow = {
  display: "grid",
  gridTemplateColumns: "120px repeat(3, 1fr)",
  marginBottom: 8
};

const timeHeader = {};

const fieldHeader = {
  textAlign: "center"
};

const timeCell = {
  fontWeight: "600"
};

const cell = {
  border: "1px solid #ddd",
  borderRadius: 6,
  padding: 5,
  minHeight: 70
};

/* GAME TILE */

const gameTile = {
  background: "#f8fafc",
  borderRadius: 8,
  padding: 5
};

const division = {
  fontSize: 10,
  textAlign: "center"
};

const teamsRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const team = {
  textAlign: "center"
};

const logo = {
  width: 24
};

const vs = {
  fontWeight: "700"
};
