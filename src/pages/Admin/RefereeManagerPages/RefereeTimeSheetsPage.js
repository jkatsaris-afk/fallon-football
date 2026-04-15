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

  /* 🔥 GROUP */
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

  /* 🔥 BUDGET */
  const totalGames = schedule.length;
  const uniqueDays = [...new Set(schedule.map(g => g.event_date))];

  const totalGameBudget = totalGames * 40;
  const totalHeadRefBudget = uniqueDays.length * HEAD_REF_WEEKLY;
  const totalBudget = totalGameBudget + totalHeadRefBudget;

  /* 🔥 TOTALS */
  const paidTotal = checkins
    .filter(c => c.paid)
    .reduce((sum, c) => sum + GAME_PAY, 0);

  const unpaidTotal = checkins
    .filter(c => !c.paid)
    .reduce((sum, c) => sum + GAME_PAY, 0);

  const headRef = refs.find(r => r.is_head_ref);

  const paidDays = [
    ...new Set(
      checkins
        .filter(c => c.paid)
        .map(c => c.schedule_master_auto?.event_date)
    )
  ];

  const unpaidDays = [
    ...new Set(
      checkins
        .filter(c => !c.paid)
        .map(c => c.schedule_master_auto?.event_date)
    )
  ];

  const headRefPaidTotal = headRef ? paidDays.length * HEAD_REF_WEEKLY : 0;
  const headRefUnpaidTotal = headRef ? unpaidDays.length * HEAD_REF_WEEKLY : 0;

  const paidTotalFinal = paidTotal + headRefPaidTotal;
  const unpaidTotalFinal = unpaidTotal + headRefUnpaidTotal;

  /* 🔥 PAY DAY */
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

      {/* 🔥 TOP TILES */}
      <div style={statsGrid}>
        <StatTile label="Total Games" value={totalGames} />
        <StatTile label="Game Budget" value={`$${totalGameBudget}`} />
        <StatTile label="Head Ref Budget" value={`$${totalHeadRefBudget}`} />
        <StatTile label="Total Budget" value={`$${totalBudget}`} />
        <StatTile label="Paid" value={`$${paidTotalFinal}`} />
        <StatTile label="Unpaid" value={`$${unpaidTotalFinal}`} />
      </div>

      <h2 style={title}>Referee Pay Manager</h2>

      {Object.keys(grouped).map((refId) => {
        const ref = refs.find(r => r.id === refId);
        const days = grouped[refId];
        if (!ref) return null;

        let refTotal = 0;

        Object.keys(days).forEach(date => {
          const games = days[date];

          refTotal += games.length * GAME_PAY;

          if (ref.is_head_ref && games.length > 0) {
            refTotal += HEAD_REF_WEEKLY;
          }
        });

        return (
          <div key={refId} style={card}>

            {/* HEADER */}
            <div style={header}>
              <div>
                <div style={name}>
                  {ref.first_name} {ref.last_name}
                  {/* 🔥 ROLE TAG */}
                  <span style={roleTag}>
                    {ref.is_head_ref ? "Head Ref" : ref.role || "Assistant Ref"}
                  </span>
                </div>
                <div style={sub}>
                  {(ref.email || "") +
                    (ref.phone ? " • " + ref.phone : "")}
                </div>
              </div>

              <div style={payBox}>${refTotal}</div>
            </div>

            {/* DAYS */}
            <div style={dayGrid}>
              {Object.keys(days).map((date) => {
                const games = days[date];

                const unpaid = games.filter(g => !g.paid);
                const isPaid = unpaid.length === 0;

                const unpaidDayTotal =
                  unpaid.length * GAME_PAY +
                  (ref.is_head_ref && unpaid.length > 0 ? HEAD_REF_WEEKLY : 0);

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

                    {/* 🔥 UPDATED DAY TOTAL */}
                    <div style={dayTotal}>
                      ${games.length * GAME_PAY}
                      {ref.is_head_ref && games.length > 0 && " + $20 Head Ref"}
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

/* 🔥 NEW STYLE */
const roleTag = {
  marginLeft: 8,
  fontSize: 11,
  background: "rgba(59,130,246,0.12)",
  color: "#1d4ed8",
  padding: "3px 8px",
  borderRadius: 999,
  fontWeight: 600
};
