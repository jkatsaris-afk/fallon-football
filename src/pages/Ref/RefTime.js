import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefTime() {
  const [games, setGames] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return;

    // 🔥 get ref record
    const { data: refData } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    setRef(refData);

    // 🔥 get today's games
    const today = new Date().toISOString().split("T")[0];

    const { data: gamesData } = await supabase
      .from("schedule_master")
      .select("*")
      .eq("event_date", today)
      .ilike("event_type", "%game%");

    setGames(gamesData || []);

    // 🔥 get existing checkins
    const { data: checkinData } = await supabase
      .from("ref_checkins")
      .select("*")
      .eq("ref_id", refData.id);

    setCheckins(checkinData || []);

    setLoading(false);
  };

  /* ================= CHECK IN ================= */

  const checkIn = async (game) => {
    // prevent double check-in
    const exists = checkins.find(
      (c) => c.game_id === game.id
    );

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

    alert("Checked in!");
    loadData();
  };

  /* ================= TOTAL PAY ================= */

  const totalPay = checkins.reduce((sum, c) => sum + (c.pay || 0), 0);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={container}>
      <h2>Ref Time</h2>

      {/* 💰 TOTAL PAY */}
      <div style={payBox}>
        Total Earnings: <strong>${totalPay}</strong>
      </div>

      {/* 🏈 GAMES */}
      <div style={{ marginTop: 20 }}>
        {games.map((game) => {
          const checked = checkins.find(
            (c) => c.game_id === game.id
          );

          return (
            <div key={game.id} style={card}>
              <div style={{ fontWeight: 600 }}>
                {game.event_time}
              </div>

              <div>
                Field: {game.field}
              </div>

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
  marginBottom: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const btn = {
  padding: "8px 12px",
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
