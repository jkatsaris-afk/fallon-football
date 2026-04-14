import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

export default function RefereeTimeSheetsPage() {
  const [refs, setRefs] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

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
        schedule_master!game_id (*)
      `);

    setRefs(refData || []);
    setCheckins(checkinData || []);
    setLoading(false);
  };

  /* 🔥 GROUP */
  const grouped = useMemo(() => {
    const map = {};

    checkins.forEach((c) => {
      const refId = c.ref_id;
      const date = c.schedule_master?.event_date || "Unknown";

      if (!map[refId]) map[refId] = {};
      if (!map[refId][date]) map[refId][date] = [];

      map[refId][date].push(c);
    });

    return map;
  }, [checkins]);

  /* 🔥 PAY CALC */
  const calculatePay = (ref, days) => {
    let gamePay = 0;
    let headBonus = 0;
    let unpaid = 0;
    let paid = 0;

    Object.keys(days).forEach((date) => {
      const games = days[date];

      games.forEach((g) => {
        gamePay += g.pay || 20;
        if (g.paid) paid += g.pay || 20;
        else unpaid += g.pay || 20;
      });

      if (ref?.is_head_ref) {
        headBonus += 20;
      }
    });

    return {
      total: gamePay + headBonus,
      paid,
      unpaid,
      headBonus
    };
  };

  /* 🔥 GLOBAL STATS */
  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;

    checkins.forEach((c) => {
      const val = c.pay || 20;
      total += val;
      if (c.paid) paid += val;
      else unpaid += val;
    });

    return { total, paid, unpaid };
  }, [checkins]);

  /* 🔥 MARK PAID */
  const markPaid = async (refId) => {
    const refCheckins = checkins.filter(c => c.ref_id === refId && !c.paid);

    const ids = refCheckins.map(c => c.id);

    if (ids.length === 0) return;

    await supabase
      .from("ref_checkins")
      .update({ paid: true })
      .in("id", ids);

    loadData();
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={wrap}>

      {/* 🔥 TOP TILES */}
      <div style={statsGrid}>
        <StatTile label="Total" value={`$${stats.total}`} active={filter==="all"} onClick={()=>setFilter("all")} />
        <StatTile label="Paid" value={`$${stats.paid}`} active={filter==="paid"} onClick={()=>setFilter("paid")} />
        <StatTile label="Unpaid" value={`$${stats.unpaid}`} active={filter==="unpaid"} onClick={()=>setFilter("unpaid")} />
      </div>

      <h2 style={title}>Referee Pay Manager</h2>

      {Object.keys(grouped).map((refId) => {
        const ref = refs.find(r => r.id === refId);
        const days = grouped[refId];
        if (!ref) return null;

        const pay = calculatePay(ref, days);

        if (filter === "paid" && pay.unpaid > 0) return null;
        if (filter === "unpaid" && pay.unpaid === 0) return null;

        return (
          <div key={refId} style={card}>

            {/* 🔥 HEADER */}
            <div style={header}>
              <div>
                <div style={name}>{ref.first_name} {ref.last_name}</div>
                <div style={sub}>
                  {(ref.email || "") + (ref.phone ? " • " + ref.phone : "")}
                </div>
              </div>

              <div style={payBox}>
                ${pay.total}
              </div>
            </div>

            {/* 🔥 PAY SUMMARY */}
            <div style={summaryRow}>
              <span>Paid: ${pay.paid}</span>
              <span>Unpaid: ${pay.unpaid}</span>
            </div>

            {/* 🔥 DAYS */}
            <div style={dayGrid}>
              {Object.keys(days).map((date) => {
                const games = days[date];

                return (
                  <div key={date} style={dayCard}>
                    <div style={dayHeader}>
                      {date}
                      <span>{games.length} games</span>
                    </div>

                    {games.map((g) => (
                      <div key={g.id} style={gameRow}>
                        <span>
                          {g.schedule_master?.team || "Team"} vs {g.schedule_master?.opponent || "Opponent"}
                        </span>
                        <span>${g.pay || 20}</span>
                      </div>
                    ))}

                    <div style={dayTotal}>
                      ${games.length * 20}
                      {ref.is_head_ref && " + $20 Head"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 🔥 PAY BUTTON */}
            {pay.unpaid > 0 && (
              <button style={payBtn} onClick={() => markPaid(refId)}>
                Mark Paid (${pay.unpaid})
              </button>
            )}

          </div>
        );
      })}
    </div>
  );
}

/* 🔥 TILE */
function StatTile({ label, value, active, onClick }) {
  return (
    <div onClick={onClick} style={{ ...tile, ...(active ? activeTile : {}) }}>
      <div style={tileValue}>{value}</div>
      <div style={tileLabel}>{label}</div>
    </div>
  );
}

/* STYLES */

const wrap = { display:"flex", flexDirection:"column", gap:20, padding:20 };

const statsGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit, minmax(140px,1fr))",
  gap:14
};

const tile = {
  background:"#fff",
  borderRadius:18,
  padding:18,
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)",
  cursor:"pointer"
};

const activeTile = { outline:"2px solid #16a34a" };

const tileValue = { fontSize:22, fontWeight:800 };
const tileLabel = { fontSize:12, color:"#64748b" };

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

const summaryRow = {
  display:"flex",
  gap:20,
  fontSize:13,
  marginBottom:10
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
  marginTop:12,
  background:"rgba(34,197,94,0.12)",
  color:"#166534",
  border:"1px solid rgba(34,197,94,0.25)",
  padding:"10px 14px",
  borderRadius:12,
  cursor:"pointer"
};
