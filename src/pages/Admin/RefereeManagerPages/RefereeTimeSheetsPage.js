import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

export default function RefereeTimeSheetsPage() {
  const [refs, setRefs] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const GAME_PAY = 20;
  const HEAD_REF_WEEKLY = 20;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: refData } = await supabase.from("referees").select("*");

    const { data: checkinData } = await supabase
      .from("ref_checkins")
      .select(`*, schedule_master_auto!game_id (*)`);

    const { data: scheduleData } = await supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%game%");

    setRefs(refData || []);
    setCheckins(checkinData || []);
    setSchedule(scheduleData || []);

    setLoading(false);
  };

  /* GROUP */
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

  /* BUDGET */
  const totalGames = schedule.length;
  const uniqueDays = [...new Set(schedule.map(g => g.event_date))];

  const totalGameBudget = totalGames * 40;
  const totalHeadRefBudget = uniqueDays.length * HEAD_REF_WEEKLY;
  const totalBudget = totalGameBudget + totalHeadRefBudget;

  /* TOTALS */
  const paidTotal = checkins
    .filter(c => c.paid)
    .reduce((sum, c) => sum + GAME_PAY, 0);

  const unpaidTotal = checkins
    .filter(c => !c.paid)
    .reduce((sum, c) => sum + GAME_PAY, 0);

  /* PAY DAY */
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

      <div style={statsGrid}>
        <StatTile label="Total Games" value={totalGames} />
        <StatTile label="Game Budget" value={`$${totalGameBudget}`} />
        <StatTile label="Head Ref Budget" value={`$${totalHeadRefBudget}`} />
        <StatTile label="Total Budget" value={`$${totalBudget}`} />
        <StatTile label="Paid" value={`$${paidTotal}`} />
        <StatTile label="Unpaid" value={`$${unpaidTotal}`} />
      </div>

      <h2 style={title}>Referee Pay Manager</h2>

      {Object.keys(grouped).map((refId) => {
        const ref = refs.find(r => r.id === refId);
        const days = grouped[refId];
        if (!ref) return null;

        const isHeadRef = ref.role === "Head Ref";

        let refTotal = 0;

        Object.keys(days).forEach(date => {
          const games = days[date];

          refTotal += games.length * GAME_PAY;

          if (isHeadRef && games.length > 0) {
            refTotal += HEAD_REF_WEEKLY;
          }
        });

        return (
          <div key={refId} style={card}>

            <div style={header}>
              <div>
                <div style={name}>
                  {ref.first_name} {ref.last_name}
                  <span style={roleTag}>
                    {ref.role || "Assistant Ref"}
                  </span>
                </div>
                <div style={sub}>
                  {(ref.email || "") +
                    (ref.phone ? " • " + ref.phone : "")}
                </div>
              </div>

              <div style={payBox}>${refTotal}</div>
            </div>

            <div style={dayGrid}>
              {Object.keys(days).map((date) => {
                const games = days[date];

                const unpaid = games.filter(g => !g.paid);
                const isPaid = unpaid.length === 0;

                const unpaidDayTotal =
                  unpaid.length * GAME_PAY +
                  (isHeadRef && unpaid.length > 0 ? HEAD_REF_WEEKLY : 0);

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
                        <span>${GAME_PAY}</span>
                      </div>
                    ))}

                    {/* 🔥 HEAD REF LINE ITEM (FIXED) */}
                    {isHeadRef && games.length > 0 && (
                      <div style={gameRow}>
                        <span>Head Ref Weekly</span>
                        <span>${HEAD_REF_WEEKLY}</span>
                      </div>
                    )}

                    <div style={dayTotal}>
                      ${games.length * GAME_PAY +
                        (isHeadRef && games.length > 0 ? HEAD_REF_WEEKLY : 0)}
                    </div>

                    {isPaid && (
                      <div style={paidBadge}>PAID</div>
                    )}

                    {!isPaid && (
                      <button
                        style={payBtn}
                        onClick={() => markDatePaid(refId, date)}
                      >
                        Pay Day (${unpaidDayTotal})
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

/* TILE */
function StatTile({ label, value }) {
  return (
    <div style={tile}>
      <div style={tileValue}>{value}</div>
      <div style={tileLabel}>{label}</div>
    </div>
  );
}

/* STYLES (UNCHANGED) */

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
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)"
};

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

const paidBadge = {
  marginTop:10,
  background:"rgba(34,197,94,0.12)",
  color:"#166534",
  padding:"6px 10px",
  borderRadius:999,
  fontSize:12,
  fontWeight:700,
  textAlign:"center"
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

const roleTag = {
  marginLeft: 8,
  fontSize: 11,
  background: "rgba(59,130,246,0.12)",
  color: "#1d4ed8",
  padding: "3px 8px",
  borderRadius: 999,
  fontWeight: 600
};
