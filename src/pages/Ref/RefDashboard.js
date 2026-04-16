import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefDashboard() {
  const [ref, setRef] = useState(null);
  const [allGames, setAllGames] = useState([]); // 🔥 ALL games
  const [nextGame, setNextGame] = useState(null); // 🔥 NEXT game
  const [headRef, setHeadRef] = useState(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // 🔥 live update next game every minute
    const interval = setInterval(() => {
      calculateNextGame();
    }, 60000);

    return () => clearInterval(interval);
  }, [allGames]);

  const parseGameDate = (dateStr, timeStr) => {
    if (!dateStr) return null;

    const [y, m, d] = dateStr.split("-");
    let hour = 0;
    let minute = 0;

    if (timeStr) {
      const parts = timeStr.split(":");
      hour = parseInt(parts[0]) || 0;
      minute = parseInt(parts[1]) || 0;
    }

    return new Date(y, m - 1, d, hour, minute);
  };

  const calculateNextGame = () => {
    const now = new Date();

    const upcoming = allGames
      .map((g) => {
        const game = g.schedule_master;
        return {
          ...g,
          gameDate: parseGameDate(game?.event_date, game?.event_time)
        };
      })
      .filter(g => g.gameDate && g.gameDate >= now)
      .sort((a, b) => a.gameDate - b.gameDate);

    setNextGame(upcoming[0] || null);
  };

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data: refData } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle();

    setRef(refData);
    if (!refData) return;

    // 🔥 EARNINGS
    const { data: checkins } = await supabase
      .from("ref_checkins")
      .select("pay")
      .eq("ref_id", refData.id);

    const total = (checkins || []).reduce(
      (sum, c) => sum + (c.pay || 0),
      0
    );

    setEarnings(total);

    // 🔥 ALL GAMES (NOT FILTERED)
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

    setAllGames(gamesData || []);

    // 🔥 calculate immediately
    setTimeout(() => calculateNextGame(), 0);

    // 🔥 HEAD REF
    const { data: headRefData } = await supabase
      .from("referees")
      .select("first_name, last_name, phone, profile_image")
      .eq("role", "Head Ref")
      .maybeSingle();

    if (headRefData) setHeadRef(headRefData);
  };

  const getProfileImage = (file) => {
    if (!file) return null;

    return `https://qfgxbzqhwpscjpflxqfs.supabase.co/storage/v1/object/public/profile-images/${file}`;
  };

  const formatPhone = (phone) => {
    if (!phone) return "";
    const d = phone.replace(/\D/g, "");
    if (d.length !== 10) return phone;
    return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  };

  const phoneLink = (phone) => {
    if (!phone) return "#";
    return `tel:${phone.replace(/\D/g, "")}`;
  };

  if (!ref) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={container}>
      <h2 style={{ marginBottom: 20 }}>Ref Dashboard</h2>

      <div style={grid}>

        {/* EARNINGS */}
        <Tile>
          <div style={tileTitle}>Total Earnings</div>
          <div style={earningsStyle}>${earnings}</div>
        </Tile>

        {/* GAME COUNT (FIXED) */}
        <Tile>
          <div style={tileTitle}>Games Assigned</div>
          <div style={gamesCount}>{allGames.length}</div>
        </Tile>

        {/* NEXT GAME */}
        <Tile>
          <div style={tileTitle}>Next Game</div>

          {!nextGame && <div style={subText}>No upcoming games</div>}

          {nextGame && (
            <>
              <div style={{ fontWeight: 600 }}>
                {nextGame.schedule_master.home_team} vs {nextGame.schedule_master.away_team}
              </div>

              <div style={subText}>
                {nextGame.schedule_master.event_date} • {nextGame.schedule_master.event_time}
              </div>

              <div style={subText}>
                Field {nextGame.schedule_master.field}
              </div>
            </>
          )}
        </Tile>

        {/* HEAD REF */}
        <Tile>
          <div style={tileTitle}>Head Ref</div>

          {headRef && (
            <div style={headRefWrap}>
              <img src={getProfileImage(headRef.profile_image)} style={headRefImg} />
              <div style={headRefName}>
                {headRef.first_name} {headRef.last_name}
              </div>
              <a href={phoneLink(headRef.phone)} style={phoneStyle}>
                {formatPhone(headRef.phone)}
              </a>
            </div>
          )}
        </Tile>

      </div>
    </div>
  );
}

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

const tileTitle = { fontWeight: 600, marginBottom: 10 };

const subText = { fontSize: 13, color: "#64748b" };

const earningsStyle = {
  fontSize: 28,
  fontWeight: 700,
  color: "#16a34a"
};

const gamesCount = {
  fontSize: 28,
  fontWeight: 700,
  color: "#2563eb"
};

const headRefWrap = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8
};

const headRefImg = {
  width: 70,
  height: 70,
  borderRadius: "50%"
};

const headRefName = {
  fontWeight: 700
};

const phoneStyle = {
  color: "#2563eb",
  textDecoration: "none"
};
