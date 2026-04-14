import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";

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
        schedule_master (*)
      `);

    setRefs(refData || []);
    setCheckins(checkinData || []);

    setLoading(false);
  };

  /* 🔥 GROUP DATA */
  const grouped = useMemo(() => {
    const map = {};

    checkins.forEach((c) => {
      const refId = c.ref_id;
      const date = c.schedule_master?.event_date;

      if (!refId || !date) return;

      if (!map[refId]) map[refId] = {};
      if (!map[refId][date]) map[refId][date] = [];

      map[refId][date].push(c);
    });

    return map;
  }, [checkins]);

  /* 🔥 CALCULATE PAY */
  const calculatePay = (ref, days) => {
    let gamePay = 0;
    let headBonus = 0;

    Object.keys(days).forEach((date) => {
      const games = days[date];

      gamePay += games.length * 20;

      if (ref?.is_head_ref) {
        headBonus += 20;
      }
    });

    return {
      gamePay,
      headBonus,
      total: gamePay + headBonus
    };
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={wrap}>
      <h2 style={title}>Referee Pay Manager</h2>

      {Object.keys(grouped).length === 0 && (
        <div style={empty}>No check-ins yet</div>
      )}

      {Object.keys(grouped).map((refId) => {
        const ref = refs.find(r => r.id === refId);
        const days = grouped[refId];

        if (!ref) return null;

        const pay = calculatePay(ref, days);

        return (
          <div key={refId} style={card}>

            {/* 🔥 REF HEADER */}
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

              <div style={totalPay}>
                ${pay.total}
              </div>
            </div>

            {/* 🔥 DAY GRID */}
            <div style={dayGrid}>
              {Object.keys(days).map((date) => {
                const games = days[date];

                return (
                  <div key={date} style={dayCard}>

                    <div style={dayHeader}>
                      <span>{date}</span>
                      <span>{games.length} games</span>
                    </div>

                    {games.map((g) => (
                      <div key={g.id} style={gameRow}>
                        <span>
                          {g.schedule_master?.team} vs {g.schedule_master?.opponent}
                        </span>
                        <span>$20</span>
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

          </div>
        );
      })}
    </div>
  );
}

/* 🔥 STYLES */

const wrap = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: 20
};

const title = {
  fontSize: 24,
  fontWeight: 700
};

const empty = {
  color: "#64748b"
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
  flexWrap: "wrap",
  gap: 10
};

const name = {
  fontWeight: 700
};

const sub = {
  fontSize: 13,
  color: "#64748b"
};

const totalPay = {
  fontSize: 22,
  fontWeight: 800,
  color: "#16a34a"
};

const dayGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
  gap: 12
};

const dayCard = {
  background: "#f8fafc",
  borderRadius: 12,
  padding: 12,
  border: "1px solid #e5e7eb"
};

const dayHeader = {
  display: "flex",
  justifyContent: "space-between",
  fontWeight: 700,
  marginBottom: 6
};

const gameRow = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  marginTop: 4
};

const dayTotal = {
  marginTop: 8,
  fontWeight: 700,
  color: "#16a34a",
  fontSize: 13
};
