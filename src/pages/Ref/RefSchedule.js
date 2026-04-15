import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefSchedule() {
  const [refId, setRefId] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) return;

    // 🔥 GET REF ID
    const { data: ref } = await supabase
      .from("referees")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!ref) return;

    setRefId(ref.id);

    // 🔥 GET ASSIGNED GAMES
    const { data: assignments } = await supabase
      .from("ref_assignments")
      .select(`
        *,
        schedule_master_auto (
          id,
          division,
          team,
          opponent,
          event_date,
          event_time,
          field
        )
      `)
      .eq("referee_id", ref.id);

    setGames(assignments || []);
  };

  return (
    <div style={wrap}>
      <h2 style={title}>My Schedule</h2>

      {games.length === 0 && (
        <div style={empty}>No games assigned</div>
      )}

      <div style={grid}>
        {games.map((g) => {
          const game = g.schedule_master_auto;

          if (!game) return null;

          return (
            <div key={g.id} style={card}>
              <div style={matchup}>
                {game.team} vs {game.opponent}
              </div>

              <div style={meta}>
                {game.division}
              </div>

              <div style={meta}>
                {game.event_date} • {game.event_time}
              </div>

              <div style={meta}>
                Field {game.field}
              </div>

              <div style={role}>
                {g.role}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const wrap = {
  padding: 20
};

const title = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 16
};

const empty = {
  color: "#64748b"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))",
  gap: 12
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};

const matchup = {
  fontWeight: 700,
  marginBottom: 6
};

const meta = {
  fontSize: 13,
  color: "#64748b"
};

const role = {
  marginTop: 10,
  fontWeight: 600,
  color: "#16a34a"
};
