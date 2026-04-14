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

    const today = new Date().toISOString().split("T")[0];

    const { data: gamesData } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .gte("event_date", today)
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

  /* 🔥 FIXED DATE FORMAT (NO OFFSET BUG) */
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

  /* 🔥 FIXED WEEK CALC */
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

/* STYLES (UNCHANGED) */

const wrap = { padding:20, display:"flex", flexDirection:"column", gap:20 };
const title = { fontSize:24, fontWeight:700 };

const statsGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))",
  gap:14
};

const statTile = {
  background:"#fff",
  borderRadius:18,
  padding:20,
  textAlign:"center",
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)",
  minHeight:90,
  display:"flex",
  flexDirection:"column",
  justifyContent:"center"
};

const statValue = { fontSize:26, fontWeight:800 };
const greenText = { color:"#16a34a" };

const statLabel = {
  fontSize:13,
  color:"#64748b",
  marginTop:4
};

const dateTile = {
  background:"#fff",
  borderRadius:16,
  padding:14,
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  cursor:"pointer",
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)",
  gap:10,
  overflow:"hidden"
};

const dateLeft = {
  display:"flex",
  flexDirection:"column",
  gap:2,
  minWidth:0
};

const dayText = {
  fontSize:15,
  fontWeight:700,
  whiteSpace:"nowrap",
  overflow:"hidden",
  textOverflow:"ellipsis"
};

const dateText = {
  fontSize:13,
  color:"#64748b",
  whiteSpace:"nowrap",
  overflow:"hidden",
  textOverflow:"ellipsis"
};

const weekText = {
  fontSize:12,
  color:"#16a34a",
  fontWeight:600
};

const arrow = {
  fontSize:16,
  fontWeight:700,
  flexShrink:0
};

const gameGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))",
  gap:12,
  marginTop:10
};

const card = {
  background:"#fff",
  borderRadius:16,
  padding:14,
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)",
  display:"flex",
  flexDirection:"column",
  gap:10
};

const teamsRow = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  flexWrap:"wrap",
  gap:6
};

const teamSide = {
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  width:"45%",
  textAlign:"center"
};

const logoStyle = { width:36, height:36 };

const vs = { fontWeight:700, fontSize:14 };

const time = {
  textAlign:"center",
  fontSize:16,
  fontWeight:700
};

const meta = {
  display:"flex",
  justifyContent:"space-between",
  fontSize:12,
  color:"#64748b",
  flexWrap:"wrap"
};

const btnWrap = {
  display:"flex",
  justifyContent:"center",
  marginTop:8
};

const btn = {
  background:"rgba(34,197,94,0.12)",
  color:"#166534",
  border:"1px solid rgba(34,197,94,0.25)",
  padding:"8px 12px",
  borderRadius:10,
  cursor:"pointer"
};

const checkedBadge = {
  color:"#16a34a",
  fontWeight:700,
  fontSize:13
};
