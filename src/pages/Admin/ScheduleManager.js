import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

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
    const { data: f } = await supabase.from("fields").select("*").eq("type", "game").order("field_number");
    const { data: m } = await supabase.from("matchups").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: nfl } = await supabase.from("nfl_teams").select("*");

    setSchedule(s || []);
    setFields(f || []);
    setMatchups(m || []);
    setTeams(t || []);
    setNflTeams(nfl || []);
  };

  /* ================= GENERATE ================= */

  const generateSchedule = async () => {
    const { data: matchups } = await supabase.from("matchups").select("*").order("week");
    const { data: fields } = await supabase.from("fields").select("*").eq("type", "game").order("field_number");
    const { data: timeSlots } = await supabase
      .from("field_time_slots")
      .select("*")
      .eq("field_type", "game")
      .order("sort_order");

    await supabase.from(TABLE).delete();

    let insert = [];

    const weeks = [...new Set(matchups.map(m => m.week))];

    weeks.forEach(week => {
      const weekGames = matchups.filter(m => m.week === week);

      let i = 0;

      timeSlots.forEach(time => {
        fields.forEach(field => {
          const game = weekGames[i];
          if (!game) return;

          insert.push({
            matchup_id: game.id,
            week,
            field_id: field.id,
            time: time.time,
            event_type: "game"
          });

          i++;
        });
      });
    });

    await supabase.from(TABLE).insert(insert);
    loadAll();
  };

  /* ================= GROUP ================= */

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

              {/* HEADER */}
              <div style={rowHeader}>
                <div style={timeCell}></div>
                {fields.map(field => (
                  <div key={field.id} style={fieldHeader}>
                    {field.name}
                  </div>
                ))}
              </div>

              {/* ROWS */}
              {times.map(time => (
                <div key={time} style={row}>

                  <div style={timeCell}>{time}</div>

                  {fields.map(field => {
                    const game = weekGames.find(
                      g => g.time === time && g.field_id === field.id
                    );

                    if (!game) {
                      return <div key={field.id} style={cell}></div>;
                    }

                    const matchup = matchups.find(m => m.id === game.matchup_id);
                    if (!matchup) return <div style={cell}></div>;

                    const homeTeam = teams.find(t => t.id === matchup.home_team_id);
                    const awayTeam = teams.find(t => t.id === matchup.away_team_id);

                    const homeNFL = nflTeams.find(n => n.id === homeTeam?.nfl_team_id);
                    const awayNFL = nflTeams.find(n => n.id === awayTeam?.nfl_team_id);

                    return (
                      <div key={field.id} style={cell}>

                        <div style={matchTile}>

                          <div style={divisionLabel}>
                            {matchup.division}
                          </div>

                          <div style={teamRow}>

                            <div style={teamBlock}>
                              <img src={homeNFL?.logo} style={logo}/>
                              <div style={teamName}>{homeNFL?.short_name}</div>
                            </div>

                            <div style={vs}>VS</div>

                            <div style={teamBlock}>
                              <img src={awayNFL?.logo} style={logo}/>
                              <div style={teamName}>{awayNFL?.short_name}</div>
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
  marginTop: 25,
  background: "#fff",
  padding: 20,
  borderRadius: 16
};

const weekHeader = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 15
};

const rowHeader = {
  display: "flex",
  fontWeight: "600",
  marginBottom: 10
};

const row = {
  display: "flex",
  marginBottom: 8
};

const timeCell = {
  width: 100,
  fontWeight: "600"
};

const fieldHeader = {
  flex: 1,
  textAlign: "center"
};

const cell = {
  flex: 1,
  margin: 2
};

/* 🔥 MATCH TILE */

const matchTile = {
  background: "rgba(255,255,255,0.25)",
  backdropFilter: "blur(12px)",
  borderRadius: 10,
  padding: 6,
  textAlign: "center",
  border: "1px solid rgba(255,255,255,0.3)"
};

const divisionLabel = {
  fontSize: 9,
  color: "#64748b",
  marginBottom: 4
};

const teamRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const teamBlock = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "40%"
};

const logo = {
  width: 24,
  height: 24,
  objectFit: "contain"
};

const teamName = {
  fontSize: 10,
  fontWeight: "600"
};

const vs = {
  fontSize: 10,
  fontWeight: "700"
};
