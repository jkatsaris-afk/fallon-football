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

  /* ================= HELPERS ================= */

  const getLogo = (team) => {
    if (!team) return null;
    return teamLogos[team.toLowerCase().trim()] || null;
  };

  const toggleDate = (date) => {
    setOpenDates((prev) => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

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

      {/* 💰 PAY */}
      <div style={payBox}>
        Total Earnings: <strong>${totalPay}</strong>
      </div>

      {/* 📅 DATES */}
      <div style={{ marginTop: 20 }}>
        {Object.keys(grouped).map((date) => {
          const isOpen = openDates[date];

          return (
            <div key={date} style={{ marginBottom: 15 }}>

              {/* DATE HEADER */}
              <div style={dateHeader} onClick={() => toggleDate(date)}>
                {date}
                <span style={{ float: "right" }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {/* GAMES */}
              {isOpen &&
                grouped[date].map((game) => {
                  const checked = checkins.find(
                    (c) => c.game_id === game.id
                  );

                  return (
                    <div key={game.id} style={card}>

                      {/* TEAMS */}
                      <div style={teamsRow}>

                        {/* HOME */}
                        <div style={teamSide}>
                          <div style={label}>HOME</div>

                          {getLogo(game.team) && (
                            <img src={getLogo(game.team)} style={logo} />
                          )}

                          <div>{game.team}</div>
                        </div>

                        <div style={vs}>vs</div>

                        {/* AWAY */}
                        <div style={teamSide}>
                          <div style={label}>AWAY</div>

                          {getLogo(game.opponent) && (
                            <img src={getLogo(game.opponent)} style={logo} />
                          )}

                          <div>{game.opponent}</div>
                        </div>

                      </div>

                      {/* 🔥 TIME CENTERED */}
                      <div style={timeStyle}>
                        {game.event_time}
                      </div>

                      {/* 🔥 DIVISION + FIELD */}
                      <div style={metaRow}>
                        <div>Division: {game.division}</div>
                        <div>Field: {game.field}</div>
                      </div>

                      {/* 🔥 CHECK IN CENTERED */}
                      <div style={checkInWrap}>
                        {checked ? (
                          <span style={checkedBadge}>
                            ✅ Checked In
                          </span>
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

const card = {
  background: "#fff",
  padding: 15,
  borderRadius: 12,
  marginTop: 8,
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const dateHeader = {
  fontWeight: 700,
  fontSize: 16,
  padding: 10,
  background: "#f1f5f9",
  borderRadius: 10,
  cursor: "pointer"
};

const teamsRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const teamSide = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "40%"
};

const logo = {
  width: 40,
  height: 40,
  objectFit: "contain",
  marginBottom: 4
};

const label = {
  fontSize: 10,
  color: "#64748b"
};

const vs = {
  fontWeight: 700
};

const timeStyle = {
  textAlign: "center",
  fontSize: 18,
  fontWeight: 700,
  marginTop: 10,
  marginBottom: 6
};

const metaRow = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12,
  color: "#64748b"
};

const checkInWrap = {
  display: "flex",
  justifyContent: "center",
  marginTop: 10
};

const btn = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer"
};

const checkedBadge = {
  color: "#16a34a",
  fontWeight: 600
};

const payBox = {
  background: "#f0fdf4",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #bbf7d0",
  color: "#166534"
};
