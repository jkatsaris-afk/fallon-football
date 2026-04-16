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

/* ORDER */
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
      .select("id, division, week, event_type");

    const map = {};
    (schedule || []).forEach(s => {
      map[s.id] = s;
    });

    setScheduleMap(map);
    setGames(scores || []);
  };

  /* DIVISIONS */
  const divisions = useMemo(() => {
    const found = [
      ...new Set(
        games
          .map(g => scheduleMap[g.schedule_id]?.division)
          .filter(Boolean)
      )
    ];

    const sorted = [...found].sort(
      (a, b) => DIVISION_ORDER.indexOf(a) - DIVISION_ORDER.indexOf(b)
    );

    return ["all", ...sorted];
  }, [games, scheduleMap]);

  /* TEAM STATS */
  const teamStats = useMemo(() => {
    const map = {};

    games.forEach(g => {
      const division = scheduleMap[g.schedule_id]?.division || "Unknown";

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

  /* FILTER */
  const filteredTeams = useMemo(() => {
    if (selectedDivision === "all") return teamStats;
    return teamStats.filter(t => t.division === selectedDivision);
  }, [teamStats, selectedDivision]);

  /* SORT */
  const rankedTeams = useMemo(() => {
    return [...filteredTeams].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (b.pf - b.pa) - (a.pf - a.pa);
    });
  }, [filteredTeams]);

  /* PLAYED GAMES ONLY */
  const playedGames = useMemo(() => {
    return games.filter(g => g.home_score != null && g.away_score != null);
  }, [games]);

  /* DIVISION GAMES */
  const divisionGames = useMemo(() => {
    if (selectedDivision === "all") return [];

    return playedGames.filter(g => {
      const div = scheduleMap[g.schedule_id]?.division;
      return div === selectedDivision;
    });
  }, [playedGames, scheduleMap, selectedDivision]);

  /* WINNER */
  const getWinner = (g) => {
    if (g.home_score > g.away_score) return g.home_team;
    if (g.away_score > g.home_score) return g.away_team;
    return null;
  };

  /* BUILD BRACKET */
  const bracket = useMemo(() => {
    if (!divisionGames.length) return null;

    const weeks = {};
    divisionGames.forEach(g => {
      const w = scheduleMap[g.schedule_id]?.week;
      if (!weeks[w]) weeks[w] = [];
      weeks[w].push(g);
    });

    const sortedWeeks = Object.keys(weeks)
      .map(Number)
      .sort((a, b) => a - b);

    return sortedWeeks.map(w =>
      weeks[w].map(g => ({
        game: g,
        winner: getWinner(g)
      }))
    );
  }, [divisionGames, scheduleMap]);

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

      {/* TEAM TILES */}
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

      {/* BRACKET */}
      {selectedDivision !== "all" && bracket && (
        <div style={bracketWrap}>

          <h3 style={{ textAlign: "center" }}>
            {selectedDivision} Playoffs
          </h3>

          <div style={bracketContainer}>
            {bracket.map((round, i) => (
              <div key={i} style={roundColumn}>
                <div style={roundTitle}>Round {i + 1}</div>

                {round.map((match, idx) => {
                  const hLogo = TEAM_LOGOS[match.game.home_team];
                  const aLogo = TEAM_LOGOS[match.game.away_team];

                  return (
                    <div key={idx} style={matchBox}>

                      <div style={teamRow}>
                        {hLogo && <img src={hLogo} style={logo} />}
                        <span>{match.game.home_team}</span>
                      </div>

                      <div style={vsSmall}>vs</div>

                      <div style={teamRow}>
                        {aLogo && <img src={aLogo} style={logo} />}
                        <span>{match.game.away_team}</span>
                      </div>

                      {match.winner && (
                        <div style={winnerBadge}>
                          {match.winner}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </div>
      )}

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

/* BRACKET */
const bracketWrap = {
  marginTop:30,
  padding:20,
  background:"#fff",
  borderRadius:18
};

const bracketContainer = {
  display:"flex",
  gap:20,
  overflowX:"auto"
};

const roundColumn = {
  display:"flex",
  flexDirection:"column",
  gap:20,
  minWidth:180
};

const roundTitle = {
  textAlign:"center",
  fontWeight:700,
  fontSize:14
};

const matchBox = {
  background:"#f8fafc",
  padding:10,
  borderRadius:12,
  textAlign:"center"
};

const teamRow = {
  display:"flex",
  justifyContent:"center",
  gap:6,
  alignItems:"center"
};

const logo = { width:20 };
const vsSmall = { fontSize:10 };

const winnerBadge = {
  marginTop:6,
  background:"#16a34a",
  color:"#fff",
  fontSize:10,
  padding:"2px 6px",
  borderRadius:6
};
