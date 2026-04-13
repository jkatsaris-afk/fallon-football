import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefereeManager() {
  const [refs, setRefs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    loadRefs();
  }, []);

  useEffect(() => {
    if (view === "time") {
      loadCheckins();
    }
  }, [view]);

  /* ================= LOAD ================= */

  const loadRefs = async () => {
    const { data } = await supabase
      .from("referees")
      .select("*")
      .order("first_name", { ascending: true });

    setRefs(data || []);
  };

  const loadCheckins = async () => {
    const { data } = await supabase
      .from("ref_checkins")
      .select(`
        *,
        referees (
          id,
          first_name,
          last_name
        ),
        schedule_master (
          event_date,
          event_time,
          field,
          division
        )
      `)
      .order("check_in_time", { ascending: false });

    setCheckins(data || []);
  };

  /* ================= HELPERS ================= */

  const getName = (r) =>
    `${r.first_name || ""} ${r.last_name || ""}`.trim();

  const groupedByRef = checkins.reduce((acc, row) => {
    const refId = row.referees?.id;

    if (!acc[refId]) {
      acc[refId] = {
        ref: row.referees,
        games: [],
        total: 0
      };
    }

    acc[refId].games.push(row);

    if (!row.paid) {
      acc[refId].total += row.pay || 0;
    }

    return acc;
  }, {});

  /* ================= PAY ================= */

  const markPaid = async (refId) => {
    const unpaid = checkins.filter(
      (c) => c.referees?.id === refId && !c.paid
    );

    const ids = unpaid.map((c) => c.id);

    if (ids.length === 0) {
      alert("Nothing to pay");
      return;
    }

    await supabase
      .from("ref_checkins")
      .update({ paid: true })
      .in("id", ids);

    loadCheckins();
  };

  /* ================= DASHBOARD ================= */

  if (view === "dashboard") {
    return (
      <div>
        <h1>Referee Manager</h1>

        <div style={grid}>
          <Tile title="Referee Staff" onClick={() => setView("staff")} />
          <Tile title="Schedules" onClick={() => setView("schedule")} />
          <Tile title="Head Ref" onClick={() => setView("head")} />
          <Tile title="Time Sheets" onClick={() => setView("time")} />
        </div>
      </div>
    );
  }

  /* ================= TIME SHEETS ================= */

  if (view === "time") {
    return (
      <div>

        <BackBtn onClick={() => setView("dashboard")} />

        <h1>Ref Time Sheets</h1>

        {Object.values(groupedByRef).map((group) => {
          const name = getName(group.ref);

          return (
            <div key={group.ref.id} style={timeCard}>

              <div style={timeHeader}>
                <div style={{ fontWeight: 600 }}>{name}</div>
                <div>Total: ${group.total}</div>
              </div>

              {group.games.map((g) => (
                <div key={g.id} style={timeRow}>

                  <div>
                    {g.schedule_master?.event_date} • {g.schedule_master?.event_time}
                  </div>

                  <div>Field {g.schedule_master?.field}</div>

                  <div>{g.schedule_master?.division}</div>

                  <div>
                    {g.paid ? "✅ Paid" : "$" + g.pay}
                  </div>

                </div>
              ))}

              <div style={{ marginTop: 10 }}>
                <button
                  style={payBtn}
                  onClick={() => markPaid(group.ref.id)}
                >
                  Pay Ref
                </button>
              </div>

            </div>
          );
        })}

      </div>
    );
  }

  return (
    <div>
      <BackBtn onClick={() => setView("dashboard")} />
      <h2>Coming Soon</h2>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Tile({ title, onClick }) {
  return (
    <div onClick={onClick} style={tile}>
      <div style={{ fontWeight: 600 }}>{title}</div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button style={backBtn} onClick={onClick}>
      ← Back
    </button>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 20,
  marginTop: 20
};

const tile = {
  background: "#fff",
  padding: 20,
  borderRadius: 14,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const backBtn = {
  marginBottom: 10,
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "#e5e7eb"
};

/* TIME SHEETS */

const timeCard = {
  background: "#fff",
  padding: 15,
  borderRadius: 12,
  marginTop: 15,
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
};

const timeHeader = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 10
};

const timeRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 100px",
  padding: 8,
  borderTop: "1px solid #eee"
};

const payBtn = {
  background: "#16a34a",
  color: "#fff",
  padding: "6px 12px",
  border: "none",
  borderRadius: 6
};
