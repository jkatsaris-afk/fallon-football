import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

export default function RefereeTimeSheetsPage() {
  const [refs, setRefs] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: refData } = await supabase
      .from("referees")
      .select("*");

    const { data: checkinData } = await supabase
      .from("ref_checkins")
      .select(`
        *,
        schedule_master_auto!game_id (*)
      `);

    setRefs(refData || []);
    setCheckins(checkinData || []);

    setLoading(false);
  };

  /* 🔥 GROUP BY REF + DATE */
  const grouped = useMemo(() => {
    const map = {};

    checkins.forEach((c) => {
      const refId = c.ref_id;
      const date = c.schedule_master_auto?.event_date || "Unknown";

      if (!map[refId]) map[refId] = {};
      if (!map[refId][date]) map[refId][date] = [];

      map[refId][date].push(c);
    });

    return map;
  }, [checkins]);

  /* 🔥 PAY CALC */
  const calculatePay = (ref, days) => {
    let total = 0;

    Object.keys(days).forEach((date) => {
      const games = days[date];

      // $40 per game
      total += games.length * 40;

      // +$20 head ref per day
      if (ref?.is_head_ref) {
        total += 20;
      }
    });

    return total;
  };

  /* 🔥 PAY DAY BUTTON */
  const markDatePaid = async (refId, date) => {
    const rows = checkins.filter(
      (c) =>
        c.ref_id === refId &&
        !c.paid &&
        c.schedule_master_auto?.event_date === date
    );

    const ids = rows.map((r) => r.id);
    if (!ids.length) return;

    await supabase
      .from("ref_checkins")
      .update({ paid: true })
      .in("id", ids);

    loadData();
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={wrap}>

      <h2 style={title}>Referee Pay Manager</h2>

      {Object.keys(grouped).map((refId) => {
        const ref = refs.find(r => r.id === refId);
        const days = grouped[refId];
        if (!ref) return null;

        const totalPay = calculatePay(ref, days);

        return (
          <div key={refId} style={card}>

            {/* HEADER */}
            <div style={header}>
              <div>
                <div style={name}>
                  {ref.first_name} {ref.last_name}
                </div>
                <div style={sub}>
                  {(ref.email || "") +
                    (ref.phone ? " • " + ref.phone : "")}
                </div>
              </div>

              <div style={payBox}>
                ${totalPay}
              </div>
            </div>

            {/* DAYS */}
            <div style={dayGrid}>
              {Object.keys(days).map((date) => {
                const games = days[date];

                const unpaidTotal = games
                  .filter(g => !g.paid)
                  .reduce((sum) => sum + 40, 0) +
                  (ref.is_head_ref ? 20 : 0);

                return (
                  <div key={date} style={dayCard}>

                    <div style={dayHeader}>
                      {date}
                      <span>{games.length} games</span>
                    </div>

                    {games.map((g) => (
                      <div key={g.id} style={gameRow}>
                        <span>
                          {g.schedule_master_auto?.team || "Team"} vs{" "}
                          {g.schedule_master_auto?.opponent || "Opponent"}
                        </span>
                        <span>$40</span>
                      </div>
                    ))}

                    <div style={dayTotal}>
                      ${games.length * 40}
                      {ref.is_head_ref && " + $20 Head"}
                    </div>

                    {/* 🔥 PAY BUTTON */}
                    {games.some(g => !g.paid) && (
                      <button
                        style={payBtn}
                        onClick={() => markDatePaid(refId, date)}
                      >
                        Pay Day (${unpaidTotal})
                      </button>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        );
      })}
    </div>
  );
}

/* STYLES */

const wrap = { display:"flex", flexDirection:"column", gap:20, padding:20 };

const title = { fontSize:24, fontWeight:700 };

const card = {
  background:"#fff",
  borderRadius:18,
  padding:18,
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)"
};

const header = {
  display:"flex",
  justifyContent:"space-between",
  flexWrap:"wrap",
  gap:10,
  marginBottom:10
};

const name = { fontWeight:700 };
const sub = { fontSize:13, color:"#64748b" };

const payBox = {
  fontSize:22,
  fontWeight:800,
  color:"#16a34a"
};

const dayGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))",
  gap:12
};

const dayCard = {
  background:"#f8fafc",
  borderRadius:12,
  padding:12,
  border:"1px solid #e5e7eb"
};

const dayHeader = {
  display:"flex",
  justifyContent:"space-between",
  fontWeight:700
};

const gameRow = {
  display:"flex",
  justifyContent:"space-between",
  fontSize:13,
  marginTop:4
};

const dayTotal = {
  marginTop:8,
  fontWeight:700,
  color:"#16a34a",
  fontSize:13
};

const payBtn = {
  marginTop:10,
  background:"rgba(34,197,94,0.12)",
  color:"#166534",
  border:"1px solid rgba(34,197,94,0.25)",
  padding:"8px 12px",
  borderRadius:10,
  cursor:"pointer"
};
