import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

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

  /* SAFE DATE FORMAT */
  const formatDate = (dateStr) => {
    if (!dateStr) return { day: "", date: "" };

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

  /* SAFE WEEK CALC */
  const getWeekNumber = (dateStr) => {
    const dates = Object.keys(grouped || {}).sort();
    if (!dates.length || !dateStr) return 1;

    const [sy, sm, sd] = dates[0].split("-");
    const start = new Date(sy, sm - 1, sd);

    const [cy, cm, cd] = dateStr.split("-");
    const current = new Date(cy, cm - 1, cd);

    const diffDays = Math.floor((current - start) / (1000 * 60 * 60 * 24));

    return Math.floor(diffDays / 7) + 1;
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>

      <h2>Ref Time</h2>

      <div>
        Earnings: ${totalPay} | Games: {gamesReffed}
      </div>

      {Object.keys(grouped || {}).map((date) => {
        const isOpen = openDates[date];
        const { day, date: formatted } = formatDate(date);
        const week = getWeekNumber(date);

        return (
          <div key={date}>

            <div onClick={() => toggleDate(date)}>
              {day} - {formatted} (Week {week})
            </div>

            {isOpen && (
              <div>
                {(grouped[date] || []).map((game) => {
                  const checked = checkins.find(c => c.game_id === game.id);

                  return (
                    <div key={game.id}>
                      {game.team} vs {game.opponent} - {game.event_time}

                      {checked ? (
                        <span> ✔ Checked In</span>
                      ) : (
                        <button onClick={() => checkIn(game)}>
                          Check In
                        </button>
                      )}
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
