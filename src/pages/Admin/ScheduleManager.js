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
      .eq("type", "game") // ONLY game fields in grid
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

  /* ================= GENERATE ================= */

  const generateSchedule = async () => {
    const { data: matchups } = await supabase.from("matchups").select("*");
    const { data: fields } = await supabase.from("fields").select("*");
    const { data: timeSlots } = await supabase.from("field_time_slots").select("*");

    if (!matchups || !fields || !timeSlots) {
      alert("Missing data");
      return;
    }

    // SAFE DELETE
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

    const { error } = await supabase.from(TABLE).insert(insert);

    if (error) {
      console.error(error);
      alert("Error generating schedule");
    } else {
      loadAll();
      alert("Schedule Generated");
    }
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

      {/* GENERATE BUTTON */}
      <button style={btn} onClick={generateSchedule}>
        Generate Schedule
      </button>

      {/* ================= SCHEDULE ================= */}

      {weeks.map(week => {
        const weekGames = schedule.filter(s => s.week === week);
        const times = [...new Set(weekGames.map(g => g.time))];

        return (
          <div key={week} style={weekBlock}>

            <h2 style={weekHeader}>Week {week}</h2>

            {/* HEADER */}
            <div style={headerRow}>
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

                <div style={timeCell}>{time}</div>

                {fields.map(field => {
                  const game = weekGames.find(
                    g => g.time === time && g.field_id === field.id
                  );

                  if (!game) return <div style={cell}></div>;

                  const g = getGame(game.matchup_id);
                  if (!g) return <div style={cell}></div>;

                  return (
                    <div style={cell}>

                      <div style={tile}>
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

const btn = {
  marginTop: 10,
  padding: "12px 18px",
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer"
};

const weekBlock = {
  marginTop: 25,
  background: "#ffffff",
  padding: 20,
  borderRadius: 12
};

const weekHeader = {
  textAlign: "center",
  marginBottom: 15
};

const headerRow = {
  display: "grid",
  gridTemplateColumns: "120px repeat(3, 1fr)",
  marginBottom: 10
};

const row = {
  display: "grid",
  gridTemplateColumns: "120px repeat(3, 1fr)",
  marginBottom: 8
};

const timeHeader = {};

const fieldHeader = {
  textAlign: "center",
  fontWeight: "600"
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

const division = {
  fontSize: 10,
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
  fontWeight: "700"
};
