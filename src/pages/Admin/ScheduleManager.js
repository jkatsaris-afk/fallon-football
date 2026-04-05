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
    const { data: f } = await supabase.from("fields").select("*").in("type", ["game", "k-1"]);
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
    const { data: dbFields } = await supabase.from("fields").select("*");
    const { data: timeSlots } = await supabase.from("field_time_slots").select("*");

    console.log("matchups:", matchups);
    console.log("fields:", dbFields);
    console.log("timeSlots:", timeSlots);

    if (!matchups?.length) return alert("No matchups found");
    if (!dbFields?.length) return alert("No fields found");
    if (!timeSlots?.length) return alert("No time slots found");

    // CLEAR TABLE
    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error(deleteError);
      alert("Delete failed (RLS issue?)");
      return;
    }

    let insert = [];

    const weeks = [...new Set(matchups.map(m => m.week))];

    weeks.forEach(week => {
      const weekGames = matchups.filter(m => m.week === week);

      let gameIndex = 0;

      weekGames.forEach(game => {
        const isK1 = game.division === "K-1";

        const validFields = dbFields.filter(f =>
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

    console.log("INSERT DATA:", insert);

    if (!insert.length) {
      alert("No games generated");
      return;
    }

    const { error } = await supabase.from(TABLE).insert(insert);

    if (error) {
      console.error(error);
      alert("Insert failed (RLS issue?)");
      return;
    }

    alert("Schedule Generated ✅");
    loadAll();
  };

  /* ================= UI ================= */

  return (
    <div>

      <h1>Schedule Manager</h1>

      {/* ✅ ALWAYS SHOW BUTTON */}
      <button style={btn} onClick={generateSchedule}>
        Generate Schedule
      </button>

      {/* DEBUG INFO */}
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 10 }}>
        Matchups: {matchups.length} | Fields: {fields.length}
      </div>

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
