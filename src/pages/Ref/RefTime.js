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
  bills,
  bengals,
  broncos,
  lions,
  colts,
  chiefs,
  raiders,
  rams,
  jets,
  eagles,
  steelers,
  "49ers": niners,
  ravens
};

export default function RefTime() {
  const [grouped, setGrouped] = useState({});
  const [checkins, setCheckins] = useState([]);
  const [ref, setRef] = useState(null);
  const [openDates, setOpenDates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
      .from("schedule_master")
      .select("*")
      .gte("event_date", today)
      .ilike("event_type", "%game%")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });

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

  /* ================= LOGO HELPER ================= */

  const getLogo = (team) => {
    if (!team) return null;

    const key = team.toLowerCase();

    return teamLogos[key] || teamLogos[team] || null;
  };

  /* ================= TOGGLE ================= */

  const toggleDate = (date) => {
    setOpenDates((prev) => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  /* ================= CHECK IN ================= */

  const checkIn = async (game) => {
    const exists = checkins.find((c) => c.game_id === game.id);

    if (exists) {
      alert("Already checked in");
      return;
    }

    await supabase.from("ref_checkins").insert([
      {
        ref_id: ref.id,
        game_id: game.id,
        pay: 20
      }
    ]);

    loadData();
  };

  const totalPay = checkins.reduce((sum, c) => sum + (c.pay || 0), 0);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={container}>
      <h2>Ref Time</h2>

      <div style={payBox}>
        Total Earnings: <strong>${totalPay}</strong>
      </div>

      <div style={{ marginTop: 20 }}>
        {Object.keys(grouped).map((date) => {
          const isOpen = openDates[date];

          return (
            <div key={date} style={{ marginBottom: 15 }}>

              <div style={dateHeader} onClick={() => toggleDate(date)}>
                {date}
                <span style={{ float: "right" }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {isOpen &&
                grouped[date].map((game) => {
                  const checked = checkins.find(
                    (c) => c.game_id === game.id
                  );

                  return (
                    <div key={game.id} style={card}>

                      <div style={teamsRow}>

                        {/* HOME */}
                        <div style={teamSide}>
                          <div style={label}>HOME</div>
                          {getLogo(game.home_team) && (
                            <img src={getLogo(game.home_team)} style={logo} />
                          )}
                          <div>{game.home_team}</div>
                        </div>

                        <div style={vs}>vs</div>

                        {/* AWAY */}
                        <div style={teamSide}>
                          <div style={label}>AWAY</div>
                          {getLogo(game.away_team) && (
                            <img src={getLogo(game.away_team)} style={logo} />
                          )}
                          <div>{game.away_team}</div>
                        </div>

                      </div>

                      <div style={gameMeta}>
                        {game.event_time} • Field {game.field}
                      </div>

                      <div style={{ marginTop: 10 }}>
                        {checked ? (
                          <span style={checkedBadge}>✅ Checked In</span>
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
          );
        })}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const container = { padding: 20 };
const card = { background:"#fff", padding:15, borderRadius:12, marginTop:8 };
const dateHeader = { fontWeight:700, padding:10, background:"#f1f5f9", borderRadius:10, cursor:"pointer" };

const teamsRow = { display:"flex", justifyContent:"space-between", alignItems:"center" };
const teamSide = { display:"flex", flexDirection:"column", alignItems:"center", width:"40%" };
const logo = { width:40, height:40, objectFit:"contain" };
const label = { fontSize:10, color:"#64748b" };
const vs = { fontWeight:700 };

const gameMeta = { fontSize:12, color:"#64748b" };

const btn = { padding:"6px 10px", borderRadius:8, background:"#16a34a", color:"#fff", border:"none" };
const checkedBadge = { color:"#16a34a", fontWeight:600 };

const payBox = {
  background:"#f0fdf4",
  padding:12,
  borderRadius:10,
  border:"1px solid #bbf7d0",
  color:"#166534"
};
