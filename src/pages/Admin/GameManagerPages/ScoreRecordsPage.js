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

export default function TeamStatsPage() {
  const [games, setGames] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data, error } = await supabase
      .from("game_scores")
      .select(`
        *,
        schedule_master_auto: schedule_id (
          division
        )
      `);

    if (error) {
      console.error("LOAD ERROR:", error);
      return;
    }

    setGames(data || []);
  };

  /* 🔥 GET DIVISIONS */
  const divisions = useMemo(() => {
    const unique = [
      ...new Set(
        games
          .map(g => g.schedule_master_auto?.division)
          .filter(d => d && d !== "Unknown")
      )
    ];
    return ["all", ...unique];
  }, [games]);

  /* 🔥 TEAM STATS (TEAM + DIVISION) */
  const teamStats = useMemo(() => {
    const map = {};

    games.forEach(g => {
      const division =
        g.schedule_master_auto?.division ||
        g.division ||
        "Unknown";

      const teams = [
        {
          name: g.home_team,
          scored: g.home_score,
          allowed: g.away_score
        },
        {
          name: g.away_team,
          scored: g.away_score,
          allowed: g.home_score
        }
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

        // ✅ CORRECT WIN/LOSS LOGIC
        if (t.scored > t.allowed) {
          map[key].wins += 1;
        } else if (t.scored < t.allowed) {
          map[key].losses += 1;
        }
      });
    });

    return Object.values(map);
  }, [games]);

  /* 🔥 FILTER */
  const filteredTeams = useMemo(() => {
    if (selectedDivision === "all") return teamStats;
    return teamStats.filter(t => t.division === selectedDivision);
  }, [teamStats, selectedDivision]);

  return (
    <div style={wrap}>

      <h2 style={title}>Team Stats</h2>

      {/* DIVISION FILTER */}
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

      {/* TEAM GRID */}
      <div style={grid}>
        {filteredTeams.map(team => {
          const logo = TEAM_LOGOS[team.team];

          return (
            <div
              key={`${team.team}_${team.division}`}
              style={card}
            >

              {logo && <img src={logo} style={logoStyle} />}

              <div style={teamName}>{team.team}</div>

              <div style={record}>
                {team.wins} - {team.losses}
              </div>

              <div style={statsRow}>
                <span>PF: {team.pf}</span>
                <span>PA: {team.pa}</span>
              </div>

              <div style={divisionBadge}>
                {team.division}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

/* STYLES */

const wrap = { display: "flex", flexDirection: "column", gap: 20 };

const title = { fontSize: 24, fontWeight: 700 };

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))",
  gap: 10
};

const filterTile = {
  background: "#fff",
  padding: 12,
  borderRadius: 14,
  textAlign: "center",
  cursor: "pointer",
  fontWeight: 600
};

const activeTile = {
  outline: "2px solid #2563eb"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
  gap: 16
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  textAlign: "center"
};

const logoStyle = {
  width: 50,
  marginBottom: 8
};

const teamName = {
  fontWeight: 700,
  fontSize: 16
};

const record = {
  fontSize: 18,
  marginTop: 4,
  fontWeight: 700
};

const statsRow = {
  display: "flex",
  justifyContent: "center",
  gap: 10,
  marginTop: 6,
  fontSize: 12,
  color: "#64748b"
};

const divisionBadge = {
  marginTop: 8,
  background: "#e0f2fe",
  color: "#0369a1",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12
};
