import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefSchedulePage() {
  const [refId, setRefId] = useState(null);
  const [games, setGames] = useState([]);

  useEffect(() => {
    getRefId();
  }, []);

  useEffect(() => {
    if (refId) {
      loadGames();
    }
  }, [refId]);

  /* ---------------- GET REF ---------------- */

  const getRefId = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      console.warn("NO AUTH USER");
      return;
    }

    const { data, error } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Ref lookup error:", error);
      return;
    }

    if (!data) {
      console.warn("NO REF FOUND");
      return;
    }

    setRefId(data.id);
  };

  /* ---------------- LOAD GAMES ---------------- */

  const loadGames = async () => {
    const { data, error } = await supabase
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

    if (error) {
      console.error("LOAD GAMES ERROR:", error);
      return;
    }

    console.log("GAMES:", data);

    setGames(data || []);
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      <div style={title}>My Schedule</div>

      {games.length === 0 && (
        <div style={empty}>No assigned games yet</div>
      )}

      <div style={grid}>
        {games.map((g) => {
          const game = g.schedule_master;

          if (!game) return null;

          return (
            <div key={g.id} style={card}>
              
              <div style={match}>
                {game.team} vs {game.opponent}
              </div>

              <div style={meta}>
                {game.division}
              </div>

              <div style={meta}>
                {game.event_date}
              </div>

              <div style={meta}>
                {game.event_time} • Field {game.field}
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
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 16
};

const title = {
  fontSize: 22,
  fontWeight: 800
};

const empty = {
  color: "#64748b"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 12
};

const card = {
  padding: 16,
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};

const match = {
  fontWeight: 700,
  marginBottom: 6
};

const meta = {
  fontSize: 13,
  color: "#64748b"
};

const role = {
  marginTop: 10,
  fontWeight: 700,
  color: "#16a34a"
};
