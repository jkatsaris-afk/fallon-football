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
  const [timeSlots, setTimeSlots] = useState([]);

  const [mode, setMode] = useState("test");

  const TABLE = mode === "test" ? "schedule_test" : "schedule_master";

  useEffect(() => {
    loadAll();
  }, [mode]);

  /* ================= LOAD ================= */

  const loadAll = async () => {
    const { data: s } = await supabase.from(TABLE).select("*");
    const { data: f } = await supabase.from("fields").select("*").order("field_number");
    const { data: m } = await supabase.from("matchups").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: nfl } = await supabase.from("nfl_teams").select("*");
    const { data: ts } = await supabase.from("field_time_slots").select("*");

    setSchedule(s || []);
    setFields(f || []);
    setMatchups(m || []);
    setTeams(t || []);
    setNflTeams(nfl || []);
    setTimeSlots(ts || []);
  };

  /* ================= GENERATE ================= */

  const generateSchedule = async () => {
    const { data: matchups } = await supabase.from("matchups").select("*");
    const { data: fields } = await supabase.from("fields").select("*");
    const { data: timeSlots } = await supabase.from("field_time_slots").select("*");

    await supabase
      .from(TABLE)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    let insert = [];

    const weeks = [...new Set(matchups.map(m => m.week))];

    weeks.forEach(week => {
      const weekGames = matchups.filter(m => m.week === week);

      let gameIndex = 0;

      weekGames.forEach(game => {
        const isK1 = game.division === "K-1";

        const validFields = fields.filter(f =>
          isK1 ? f.type === "k-1" : f.type === "game"
        );

        const validTimes = timeSlots
          .filter(t =>
            isK1 ? t.field_type === "k-1" : t.field_type === "game"
          )
          .sort((a, b) => a.sort_order - b.sort_order);

        const field = validFields[gameIndex % validFields.length];
        const time = validTimes[Math.floor(gameIndex / validFields.length)];

        if (!field || !time) return;

        insert.push({
          matchup_id: game.id,
          week,
          field_id: field.id,
          time: time.time,
          event_type: "game"
        });

        gameIndex++;
      });
    });

    await supabase.from(TABLE).insert(insert);
    loadAll();
  };

  /* ================= HELPERS ================= */

  const getGameDisplay = (matchupId) => {
    const m = matchups.find(x => x.id === matchupId);
    if (!m) return null;

    const homeTeam = teams.find(t => t.id === m.home_team_id);
    const awayTeam = teams.find(t => t.id === m.away_team_id);

    const homeNFL = nflTeams.find(n => n.id === homeTeam?.nfl_team_id);
    const awayNFL = nflTeams.find(n => n.id === awayTeam?.nfl_team_id);

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
      <div style={toggleRow}>
        <button style={toggleBtn(mode === "test")} onClick={() => setMode("test")}>
          Test
        </button>
        <button style={toggleBtn(mode === "live")} onClick={() => setMode("live")}>
          Live
        </button>
      </div>

      {/* GENERATE */}
      {schedule.length === 0 && (
        <button style={btn} onClick={generateSchedule}>
          Generate Schedule ({mode})
        </button>
      )}

      {/* ================= SCHEDULE ================= */}

      {schedule.length > 0 &&
        weeks.map(week => {
          const weekGames = schedule.filter(s => s.week === week);
          const times = [...new Set(weekGames.map(g => g.time))];

          return (
            <div key={week} style={weekBlock}>

              <div style={weekHeader}>WEEK {week}</div>

              <div style={board}>

                {/* HEADER */}
                <div style={rowHeader}>
                  <div style={timeHeader}></div>
                  {fields.map(field => (
                    <div key={field.id} style={fieldHeader}>
                      {field.name}
                    </div>
                  ))}
                </div>

                {/* ROWS */}
                {times.map(time => (
                  <div key={time} style={row}>

                    <div style={timeTile}>{time}</div>

                    {fields.map(field => {
                      const game = weekGames.find(
                        g => g.time === time && g.field_id === field.id
                      );

                      if (!game) return <div key={field.id} style={cell}></div>;

                      const g = getGameDisplay(game.matchup_id);
                      if (!g) return <div style={cell}></div>;

                      return (
                        <div key={field.id} style={cell}>

                          <div style={gameTile}>

                            <div style={division}>
                              {g.division}
                            </div>

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

            </div>
          );
        })
      }

    </div>
  );
}

/* ================= STYLES ================= */

const btn = {
  marginTop: 10,
  padding: "12px 18px",
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10
};

const toggleRow = {
  display: "flex",
  gap: 10,
  marginBottom: 10
};

const toggleBtn = (active) => ({
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: active ? "#2f6ea6" : "#e2e8f0",
  color: active ? "#fff" : "#000"
});

const weekBlock = {
  marginTop: 25
};

const weekHeader = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 10
};

/* BOARD */

const board = {
  background: "rgba(255,255,255,0.2)",
  backdropFilter: "blur(14px)",
  padding: 15,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.3)"
};

const rowHeader = {
  display: "grid",
  gridTemplateColumns: "100px repeat(auto-fit, 1fr)",
  marginBottom: 8
};

const row = {
  display: "grid",
  gridTemplateColumns: "100px repeat(auto-fit, 1fr)",
  marginBottom: 6
};

const timeHeader = {
  width: 100
};

const fieldHeader = {
  textAlign: "center",
  fontWeight: "600"
};

const timeTile = {
  background: "#2f6ea6",
  color: "#fff",
  borderRadius: 8,
  padding: 10,
  textAlign: "center",
  fontWeight: "600"
};

const cell = {
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  margin: 2,
  padding: 4,
  minHeight: 80
};

/* GAME TILE */

const gameTile = {
  background: "rgba(255,255,255,0.35)",
  backdropFilter: "blur(10px)",
  borderRadius: 10,
  padding: 6,
  height: "100%"
};

const division = {
  fontSize: 10,
  textAlign: "center",
  color: "#64748b"
};

const teamsRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const team = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "40%"
};

const logo = {
  width: 26,
  height: 26
};

const vs = {
  fontWeight: "700",
  fontSize: 12
};
