import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefDashboard() {
  const [user, setUser] = useState(null);
  const [ref, setRef] = useState(null);
  const [games, setGames] = useState([]);
  const [headRef, setHeadRef] = useState(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user;
    if (!currentUser) return;

    setUser(currentUser);

    const { data: refData } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", currentUser.id)
      .maybeSingle();

    setRef(refData);
    if (!refData) return;

    const { data: checkins } = await supabase
      .from("ref_checkins")
      .select("pay")
      .eq("ref_id", refData.id);

    const total = (checkins || []).reduce(
      (sum, c) => sum + (c.pay || 0),
      0
    );

    setEarnings(total);

    const { data: gamesData } = await supabase
      .from("ref_assignments")
      .select(`
        *,
        schedule_master (
          id,
          event_date,
          event_time,
          field,
          home_team,
          away_team
        )
      `)
      .eq("ref_id", refData.id);

    setGames(gamesData || []);

    const { data: headRefData } = await supabase
      .from("referees")
      .select("first_name, last_name, phone, profile_image")
      .eq("role", "Head Ref")
      .maybeSingle();

    if (headRefData) {
      setHeadRef(headRefData);
    }
  };

  /* 🔥 FIXED IMAGE BUILDER */
  const getProfileImage = (file) => {
    if (!file) return null;

    const SUPABASE_URL = "https://qfgxbzqhwpscjpflxqfs.supabase.co";
    const BUCKET = "profile-images"; // ✅ CORRECT BUCKET

    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file}`;
  };

  if (!ref) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={container}>
      <h2 style={{ marginBottom: 20 }}>Ref Dashboard</h2>

      <div style={grid}>

        <Tile>
          <div style={tileTitle}>Total Earnings</div>

          <div style={earningsStyle}>
            ${earnings}
          </div>

          <div style={subText}>
            Based on completed check-ins
          </div>
        </Tile>

        <Tile>
          <div style={tileTitle}>Approval Status</div>

          <div style={statusStyle(ref.status)}>
            {ref.status || "pending"}
          </div>

          {ref.status !== "approved" && (
            <div style={subText}>
              Awaiting league approval
            </div>
          )}
        </Tile>

        {/* 🔥 HEAD REF TILE */}
        <Tile>
          <div style={tileTitle}>Head Ref</div>

          {!headRef && (
            <div style={subText}>Not assigned yet</div>
          )}

          {headRef && (
            <div style={headRefWrap}>

              {getProfileImage(headRef.profile_image) ? (
                <img
                  src={getProfileImage(headRef.profile_image)}
                  style={headRefImg}
                />
              ) : (
                <div style={avatarFallback}>
                  {headRef.first_name?.[0]}
                </div>
              )}

              <div style={headRefName}>
                {headRef.first_name} {headRef.last_name}
              </div>

              <div style={subText}>{headRef.phone}</div>
            </div>
          )}
        </Tile>

        <Tile>
          <div style={tileTitle}>My Games</div>

          {games.length === 0 && (
            <div style={subText}>No games assigned</div>
          )}

          {games.map((g) => {
            const game = g.schedule_master;

            return (
              <div key={g.id} style={gameRow}>
                <div>
                  {game.home_team} vs {game.away_team}
                </div>
                <div style={gameMeta}>
                  {game.event_date} • {game.event_time}
                </div>
                <div style={gameMeta}>
                  Field {game.field}
                </div>
              </div>
            );
          })}
        </Tile>

      </div>
    </div>
  );
}

/* TILE */
function Tile({ children }) {
  return <div style={tile}>{children}</div>;
}

/* STYLES */

const container = { padding: 20 };

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 16
};

const tile = {
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const tileTitle = {
  fontWeight: 600,
  marginBottom: 10
};

const subText = {
  fontSize: 13,
  color: "#64748b"
};

const earningsStyle = {
  fontSize: 28,
  fontWeight: 700,
  color: "#16a34a"
};

const statusStyle = (status) => ({
  fontSize: 18,
  fontWeight: 700,
  color:
    status === "approved"
      ? "#16a34a"
      : status === "denied"
      ? "#dc2626"
      : "#f59e0b"
});

/* HEAD REF */

const headRefWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8
};

const headRefImg = {
  width: 70,
  height: 70,
  borderRadius: "50%",
  objectFit: "cover"
};

const avatarFallback = {
  width: 70,
  height: 70,
  borderRadius: "50%",
  background: "#e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 22,
  color: "#475569"
};

const headRefName = {
  fontWeight: 700,
  fontSize: 16
};

const gameRow = {
  marginTop: 10,
  paddingTop: 10,
  borderTop: "1px solid #e5e7eb"
};

const gameMeta = {
  fontSize: 12,
  color: "#64748b"
};
