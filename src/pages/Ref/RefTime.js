import React, { useEffect, useState } from "react";
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

export default function RefTime() {
  const [grouped, setGrouped] = useState({});
  const [checkins, setCheckins] = useState([]);
  const [ref, setRef] = useState(null);
  const [openDates, setOpenDates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data: refData } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    setRef(refData);

    /* 🔥 FIX: REMOVED TODAY FILTER */
    const { data: gamesData } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%game%")
      .order("event_date")
      .order("event_time");

    const groupedData = (gamesData || []).reduce((acc, game) => {
      if (!acc[game.event_date]) acc[game.event_date] = [];
      acc[game.event_date].push(game);
      return acc;
    }, {});

    setGrouped(groupedData);

    const { data: checkinData } = await supabase
      .from("ref_checkins")
      .select("*")
      .eq("ref_id", refData.id);

    setCheckins(checkinData || []);
    setLoading(false);
  };

  const checkIn = async (game) => {
    const exists = checkins.find((c) => c.game_id === game.id);
    if (exists) return;

    await supabase.from("ref_checkins").insert([
      { ref_id: ref.id, game_id: game.id, pay: 20 }
    ]);

    loadData();
  };

  const toggleDate = (date) => {
    setOpenDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const totalPay = checkins.reduce((s, c) => s + (c.pay || 0), 0);
  const gamesReffed = checkins.length;

  /* DATE FORMAT FIX */
  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-");
    const d = new Date(year, month - 1, day);

    return {
      day: d.toLocaleDateString("en-US", { weekday: "long" }),
      date: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    };
  };

  /* WEEK FIX */
  const getWeekNumber = (dateStr) => {
    const dates = Object.keys(grouped).sort();
    if (!dates.length) return 1;

    const [sy, sm, sd] = dates[0].split("-");
    const start = new Date(sy, sm - 1, sd);

    const [cy, cm, cd] = dateStr.split("-");
    const current = new Date(cy, cm - 1, cd);

    const diffDays = Math.floor((current - start) / (1000 * 60 * 60 * 24));

    return Math.floor(diffDays / 7) + 1;
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={wrap}>

      {/* TOP TILES */}
      <div style={statsGrid}>
        <StatTile label="Earnings" value={`$${totalPay}`} highlight />
        <StatTile label="Games" value={gamesReffed} />
      </div>

      <h2 style={title}>Ref Time</h2>

      {Object.keys(grouped).map((date) => {
        const isOpen = openDates[date];
        const { day, date: formatted } = formatDate(date);
        const week = getWeekNumber(date);

        return (
          <div key={date}>

            <div style={dateTile} onClick={() => toggleDate(date)}>
              <div style={dateLeft}>
                <div style={dayText}>{day}</div>
                <div style={dateText}>{formatted}</div>
                <div style={weekText}>Week {week}</div>
              </div>

              <div style={arrow}>
                {isOpen ? "▲" : "▼"}
              </div>
            </div>

            {isOpen && (
              <div style={gameGrid}>
                {grouped[date].map((game) => {
                  const checked = checkins.find(c => c.game_id === game.id);

                  return (
                    <div key={game.id} style={card}>

                      <div style={teamsRow}>
                        <TeamSide team={game.team} />
                        <div style={vs}>vs</div>
                        <TeamSide team={game.opponent} />
                      </div>

                      <div style={time}>{game.event_time}</div>

                      <div style={meta}>
                        <span>{game.division}</span>
                        <span>{game.field}</span>
                      </div>

                      <div style={btnWrap}>
                        {checked ? (
                          <span style={checkedBadge}>Checked In</span>
                        ) : (
                          <button style={btn} onClick={() => checkIn(game)}>
                            Check In
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}

/* COMPONENTS + STYLES (UNCHANGED) */
