// 🔥 FULL FILE — ONLY TILE UI UPDATED (CARD SECTION + NEW STYLES)

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
      .maybeSingle();

    if (!refData) {
      console.error("No ref found");
      setLoading(false);
      return;
    }

    setRef(refData);

    const { data: gamesData } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%game%")
      .order("event_date")
      .order("event_time");

    const groupedData = (gamesData || []).reduce((acc, game) => {
      if (!game?.event_date) return acc;
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
    if (!ref) return;

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

  const formatDate = (dateStr) => {
    if (!dateStr) return { day: "", date: "" };
    const [y, m, d] = dateStr.split("-");
    const date = new Date(y, m - 1, d);

    return {
      day: date.toLocaleDateString("en-US", { weekday: "long" }),
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    };
  };

  const getWeekNumber = (dateStr) => {
    const dates = Object.keys(grouped || {}).sort();
    if (!dates.length || !dateStr) return 1;

    const [sy, sm, sd] = dates[0].split("-");
    const start = new Date(sy, sm - 1, sd);

    const [cy, cm, cd] = dateStr.split("-");
    const current = new Date(cy, cm - 1, cd);

    const diff = Math.floor((current - start) / (1000 * 60 * 60 * 24));
    return Math.floor(diff / 7) + 1;
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={wrap}>

      <div style={statsGrid}>
        <StatTile label="Earnings" value={`$${totalPay}`} highlight />
        <StatTile label="Games" value={gamesReffed} />
      </div>

      <h2 style={title}>Ref Time</h2>

      {Object.keys(grouped || {}).map((date) => {
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
              <div style={arrow}>{isOpen ? "▲" : "▼"}</div>
            </div>

            {isOpen && (
              <div style={gameGrid}>
                {(grouped[date] || []).map((game) => {
                  const checked = checkins.find(c => c.game_id === game.id);

                  return (
                    <div key={game.id} style={card}>

                      {/* TEAMS */}
                      <div style={teamsRow}>
                        <TeamSide team={game.team} />
                        <div style={vs}>vs</div>
                        <TeamSide team={game.opponent} />
                      </div>

                      {/* INFO STACK */}
                      <div style={infoStack}>
                        <div style={timeBar}>{game.event_time}</div>
                        <div style={fieldBar}>Field {game.field}</div>
                        <div style={divisionBar}>{game.division}</div>
                      </div>

                      {/* BUTTON */}
                      <div style={btnWrap}>
                        {checked ? (
                          <div style={checkedBadgeFull}>Checked In</div>
                        ) : (
                          <button style={btnFull} onClick={() => checkIn(game)}>
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

/* COMPONENTS */

function StatTile({ label, value, highlight }) {
  return (
    <div style={statTile}>
      <div style={{ ...statValue, ...(highlight ? greenText : {}) }}>
        {value}
      </div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

function TeamSide({ team }) {
  const logo = team ? teamLogos[team.toLowerCase().trim()] : null;

  return (
    <div style={teamSide}>
      {logo && <img src={logo} style={logoStyle} />}
      <div>{team}</div>
    </div>
  );
}

/* STYLES */

const infoStack = {
  display:"flex",
  flexDirection:"column",
  gap:6,
  marginTop:10
};

const pillBase = {
  padding:"8px 10px",
  borderRadius:10,
  fontSize:13,
  fontWeight:600,
  textAlign:"center",
  width:"100%"
};

const timeBar = {
  ...pillBase,
  background:"#e0f2fe",
  color:"#0369a1"
};

const fieldBar = {
  ...pillBase,
  background:"#dcfce7",
  color:"#166534"
};

const divisionBar = {
  ...pillBase,
  background:"#fef9c3",
  color:"#854d0e"
};

const btnFull = {
  width:"100%",
  background:"#22c55e",
  color:"#fff",
  padding:"10px",
  borderRadius:12,
  border:"none",
  fontWeight:600,
  cursor:"pointer"
};

const checkedBadgeFull = {
  width:"100%",
  background:"#bbf7d0",
  color:"#166534",
  padding:"10px",
  borderRadius:12,
  fontWeight:700,
  textAlign:"center"
};
