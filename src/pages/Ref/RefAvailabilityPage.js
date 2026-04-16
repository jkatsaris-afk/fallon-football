import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefSchedulePage() {
  const [refId, setRefId] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    getRefId();
  }, []);

  useEffect(() => {
    if (refId) loadGames();
  }, [refId]);

  /* ---------------- GET REF ---------------- */

  const getRefId = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return;

    const { data } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (data) setRefId(data.id);
  };

  /* ---------------- LOAD GAMES ---------------- */

  const loadGames = async () => {
    const { data } = await supabase
      .from("ref_assignments")
      .select(`
        id,
        role,
        schedule_master (
          id,
          event_date,
          event_time,
          field,
          team,
          opponent,
          division
        )
      `)
      .eq("referee_id", refId);

    setGames(data || []);
  };

  /* ---------------- STATS ---------------- */

  const totalGames = games.length;

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      {/* HEADER */}
      <div style={header}>My Schedule</div>

      {/* STATS */}
      <div style={statsGrid}>
        <StatTile label="Games Assigned" value={totalGames} />
        <StatTile label="Upcoming" value={totalGames} />
      </div>

      {/* GAMES */}
      <div style={grid}>
        {games.length === 0 && (
          <div style={empty}>No games assigned yet</div>
        )}

        {games.map((g) => {
          const game = g.schedule_master;
          if (!game) return null;

          return (
            <div key={g.id} style={card}>

              {/* MATCH */}
              <div style={match}>
                {game.team} vs {game.opponent}
              </div>

              {/* DETAILS */}
              <div style={details}>
                <div>{game.division}</div>
                <div>{game.event_date}</div>
                <div>{game.event_time} • Field {game.field}</div>
              </div>

              {/* FOOTER */}
              <div style={footer}>
                <div style={role}>{g.role}</div>

                <button style={checkBtn}>
                  Check In
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function StatTile({ label, value }) {
  return (
    <div style={statCard}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const wrap = {
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  maxWidth: 700,
  margin: "0 auto"
};

const header = {
  fontSize: 24,
  fontWeight: 800,
  textAlign: "center"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 12
};

const statCard = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const statValue = {
  fontSize: 26,
  fontWeight: 800,
  color: "#16a34a"
};

const statLabel = {
  fontSize: 13,
  color: "#64748b"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 14
};

const card = {
  background: "#fff",
  borderRadius: 20,
  padding: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const match = {
  fontSize: 18,
  fontWeight: 800
};

const details = {
  fontSize: 14,
  color: "#64748b",
  display: "flex",
  flexDirection: "column",
  gap: 4
};

const footer = {
  marginTop: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const role = {
  fontWeight: 700,
  color: "#16a34a"
};

const checkBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer"
};

const empty = {
  textAlign: "center",
  color: "#64748b"
};
