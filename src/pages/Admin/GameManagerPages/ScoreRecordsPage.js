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

/* KEEP YOUR ORDER BUT DON'T FORCE FILTER BREAK */
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

  /* 🔥 REAL DIVISIONS (SAFE SORT) */
  const divisions = useMemo(() => {
    const found = [
      ...new Set(
        games.map(g => scheduleMap[g.schedule_id]).filter(Boolean)
      )
    ];

    return [
      "all",
      ...found.sort(
        (a, b) =>
          DIVISION_ORDER.indexOf(a) - DIVISION_ORDER.indexOf(b)
      )
    ];
  }, [games, scheduleMap]);

  /* 🔥 KEEP YOUR WORKING TEAM LOGIC */
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

  const filteredTeams = useMemo(() => {
    if (selectedDivision === "all") return teamStats;
    return teamStats.filter(t => t.division === selectedDivision);
  }, [teamStats, selectedDivision]);

  const rankedTeams = useMemo(() => {
    return [...filteredTeams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.pf - b.pa) - (a.pf - a.pa);
    });
  }, [filteredTeams]);

  /* 🔥 SIMPLE BRACKET (SAFE ADDITION) */
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

      {/* ✅ TEAM TILES (UNCHANGED) */}
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

      {/* 🔥 BRACKET (ADDED SAFELY BELOW) */}
      {selectedDivision !== "all" && bracketTeams.length >= 4 && (
        <div style={bracketWrap}>

          <div style={bracketGrid}>

            <div style={side}>
              <Match team={bracketTeams[0]} />
              <Match team={bracketTeams[3]} />
            </div>

            <div style={center}>
              <div style={champBox}>Championship</div>
            </div>

            <div style={side}>
              <Match team={bracketTeams[1]} />
              <Match team={bracketTeams[2]} />
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

function Match({ team }) {
  const logo = TEAM_LOGOS[team?.team];

  return (
    <div style={matchBox}>
      {logo && <img src={logo} style={{ width: 24 }} />}
      <div>{team?.team}</div>
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
  padding:"4px 10px",
  borderRadius:999,
  fontSize:12
};

/* BRACKET */
const bracketWrap = {
  marginTop:30,
  background:"#fff",
  padding:20,
  borderRadius:18
};

const bracketGrid = {
  display:"grid",
  gridTemplateColumns:"1fr 1fr 1fr",
  alignItems:"center"
};

const side = {
  display:"flex",
  flexDirection:"column",
  gap:40,
  alignItems:"center"
};

const center = {
  display:"flex",
  justifyContent:"center"
};

const matchBox = {
  background:"#f8fafc",
  padding:10,
  borderRadius:10,
  textAlign:"center"
};

const champBox = {
  background:"#16a34a",
  color:"#fff",
  padding:"10px 20px",
  borderRadius:10,
  fontWeight:700
};
