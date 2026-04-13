import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

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

    // 🔥 GROUP BY DATE
    const groupedData = (gamesData || []).reduce((acc, game) => {
      if (!acc[game.event_date]) {
        acc[game.event_date] = [];
      }
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

  /* ================= TOTAL PAY ================= */

  const totalPay = checkins.reduce(
    (sum, c) => sum + (c.pay || 0),
    0
  );

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

              {/* 🔥 DATE HEADER (CLICKABLE) */}
              <div
                style={dateHeader}
                onClick={() => toggleDate(date)}
              >
                {date}
                <span style={{ float: "right" }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {/* 🔥 DROPDOWN CONTENT */}
              {isOpen &&
                grouped[date].map((game) => {
                  const checked = checkins.find(
                    (c) => c.game_id === game.id
                  );

                  return (
                    <div key={game.id} style={card}>

                      {/* TEAMS */}
                      <div style={teams}>
                        {game.home_team} vs {game.away_team}
                      </div>

                      {/* META */}
                      <div style={gameMeta}>
                        {game.event_time} • Field {game.field}
                      </div>

                      {/* CHECK IN */}
                      <div style={{ marginTop: 10 }}>
                        {checked ? (
                          <span style={checkedBadge}>
                            ✅ Checked In
                          </span>
                        ) : (
                          <button
                            style={btn}
                            onClick={() => checkIn(game)}
                          >
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

const container = {
  padding: 20
};

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

const teams = {
  fontWeight: 600,
  marginBottom: 4
};

const gameMeta = {
  fontSize: 12,
  color: "#64748b"
};

const btn = {
  padding: "6px 10px",
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
