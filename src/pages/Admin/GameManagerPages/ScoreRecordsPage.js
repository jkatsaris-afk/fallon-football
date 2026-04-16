import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

/* TEAM LOGOS */
import Logo49ers from "../../../resources/San Francisco 49ers.png";
import LogoBengals from "../../../resources/Cincinnati Bengals.png";
import LogoBills from "../../../resources/Buffalo Bills.png";
import LogoBroncos from "../../../resources/Denver Broncos.png";
import LogoChiefs from "../../../resources/Kansas City Chiefs.png";
import LogoColts from "../../../resources/Indianapolis Colts.png";
import LogoEagles from "../../../resources/Philadelphia Eagles.png";
import LogoJets from "../../../resources/New York Jets.png";
import LogoLions from "../../../resources/Detroit Lions.png";
import LogoRaiders from "../../../resources/Las Vegas Raiders.png";
import LogoRams from "../../../resources/Los Angeles Rams.png";
import LogoSteelers from "../../../resources/Pittsburgh Steelers.png";
import LogoRavens from "../../../resources/Baltimore Ravens.png";

const TEAM_LOGOS = {
  "49ers": Logo49ers,
  Bengals: LogoBengals,
  Bills: LogoBills,
  Broncos: LogoBroncos,
  Chiefs: LogoChiefs,
  Colts: LogoColts,
  Eagles: LogoEagles,
  Jets: LogoJets,
  Lions: LogoLions,
  Raiders: LogoRaiders,
  Rams: LogoRams,
  Steelers: LogoSteelers,
  Ravens: LogoRavens,
};

/* 🔥 YOUR ORDER */
const DIVISION_ORDER = ["K-1st", "2nd-3rd", "4th-5th", "6th-8th"];

export default function TeamStatsPage() {
  const [games, setGames] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({});
  const [selectedDivision, setSelectedDivision] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: scores } = await supabase
      .from("game_scores")
      .select("*");

    const { data: schedule } = await supabase
      .from("schedule_master_auto")
      .select("id, division");

    const map = {};
    (schedule || []).forEach(s => {
      map[s.id] = s.division;
    });

    setScheduleMap(map);
    setGames(scores || []);
  };

  /* 🔥 GET REAL DIVISIONS */
  const divisions = useMemo(() => {
    const found = [
      ...new Set(
        games
          .map(g => scheduleMap[g.schedule_id])
          .filter(Boolean)
      )
    ];

    // 🔥 SORT USING YOUR ORDER
    const sorted = [...found].sort(
      (a, b) => DIVISION_ORDER.indexOf(a) - DIVISION_ORDER.indexOf(b)
    );

    return ["all", ...sorted];
  }, [games, scheduleMap]);

  /* 🔥 TEAM STATS */
  const teamStats = useMemo(() => {
    const map = {};

    games.forEach(g => {
      const division = scheduleMap[g.schedule_id] || "Unknown";

      const teams = [
        { name: g.home_team, scored: g.home_score, allowed: g.away_score },
        { name: g.away_team, scored: g.away_score, allowed: g.home_score }
      ];

      teams.forEach(t => {
        const key = `${t.name}_${division}`;

        if (!map[key]) {
          map[key] = {
            team: t.name,
            division,
            wins: 0,
            losses: 0,
            pf: 0,
            pa: 0
          };
        }

        map[key].pf += t.scored;
        map[key].pa += t.allowed;

        if (t.scored > t.allowed) map[key].wins += 1;
        else if (t.scored < t.allowed) map[key].losses += 1;
      });
    });

    return Object.values(map);
  }, [games, scheduleMap]);

  /* 🔥 FILTER */
  const filteredTeams = useMemo(() => {
    if (selectedDivision === "all") return teamStats;
    return teamStats.filter(t => t.division === selectedDivision);
  }, [teamStats, selectedDivision]);

  /* 🔥 SORT STANDINGS */
  const rankedTeams = useMemo(() => {
    return [...filteredTeams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.pf - b.pa) - (a.pf - a.pa);
    });
  }, [filteredTeams]);

  /* 🔥 TOP 4 FOR BRACKET */
  const bracketTeams = rankedTeams.slice(0, 4);

  return (
    <div style={wrap}>

      <h2 style={title}>Team Stats</h2>

      {/* FILTER */}
      <div style={filterGrid}>
        {divisions.map(d => (
          <div
            key={d}
            style={{
              ...filterTile,
              ...(selectedDivision === d ? activeTile : {})
            }}
            onClick={() => setSelectedDivision(d)}
          >
            {d === "all" ? "All Divisions" : d}
          </div>
        ))}
      </div>

      {/* TEAM TILES (ALWAYS SHOW) */}
      <div style={grid}>
        {rankedTeams.map(team => {
          const logo = TEAM_LOGOS[team.team];

          return (
            <div key={`${team.team}_${team.division}`} style={card}>
              {logo && <img src={logo} style={logoStyle} />}
              <div style={teamName}>{team.team}</div>
              <div style={record}>{team.wins} - {team.losses}</div>

              <div style={statsRow}>
                <span>PF: {team.pf}</span>
                <span>PA: {team.pa}</span>
              </div>

              <div style={divisionBadge}>{team.division}</div>
            </div>
          );
        })}
      </div>

      {/* 🔥 BRACKET (BELOW, NOT REPLACING) */}
      {selectedDivision !== "all" && bracketTeams.length >= 4 && (
        <div style={bracketWrap}>

          <h3 style={{ textAlign: "center" }}>
            {selectedDivision} Playoffs
          </h3>

          <div style={bracketGrid}>
            <Match t1={bracketTeams[0]} t2={bracketTeams[3]} />
            <Match t1={bracketTeams[1]} t2={bracketTeams[2]} />
          </div>

          <div style={finalBox}>Championship Game</div>

        </div>
      )}

    </div>
  );
}

/* MATCH */
function Match({ t1, t2 }) {
  return (
    <div style={matchCard}>
      <div>{t1?.team}</div>
      <div style={{ fontSize: 12 }}>vs</div>
      <div>{t2?.team}</div>
    </div>
  );
}

/* STYLES */
const wrap = { display:"flex", flexDirection:"column", gap:20 };
const title = { fontSize:24, fontWeight:700 };

const filterGrid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",
  gap:10
};

const filterTile = {
  background:"#fff",
  padding:12,
  borderRadius:14,
  textAlign:"center",
  cursor:"pointer",
  fontWeight:600
};

const activeTile = { outline:"2px solid #2563eb" };

const grid = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
  gap:16
};

const card = {
  background:"#fff",
  borderRadius:18,
  padding:18,
  boxShadow:"0 8px 24px rgba(0,0,0,0.08)",
  textAlign:"center"
};

const logoStyle = { width:50, marginBottom:8 };
const teamName = { fontWeight:700 };
const record = { fontSize:18, fontWeight:700 };

const statsRow = {
  display:"flex",
  justifyContent:"center",
  gap:10,
  fontSize:12,
  color:"#64748b"
};

const divisionBadge = {
  marginTop:8,
  background:"#e0f2fe",
  color:"#0369a1",
  padding:"4px 10px",
  borderRadius:999,
  fontSize:12
};

const bracketWrap = {
  marginTop:30,
  padding:20,
  background:"#fff",
  borderRadius:18
};

const bracketGrid = {
  display:"grid",
  gridTemplateColumns:"1fr 1fr",
  gap:20
};

const matchCard = {
  padding:12,
  background:"#f8fafc",
  borderRadius:12,
  textAlign:"center"
};

const finalBox = {
  marginTop:20,
  textAlign:"center",
  fontWeight:700
};
