import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

/* ================= LOGOS ================= */

import bills from "../../resources/Buffalo Bills.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import broncos from "../../resources/Denver Broncos.png";
import lions from "../../resources/Detroit Lions.png";
import colts from "../../resources/Indianapolis Colts.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import jets from "../../resources/New York Jets.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import steelers from "../../resources/Pittsburgh Steelers.png";
import niners from "../../resources/San Francisco 49ers.png";
import ravens from "../../resources/Baltimore Ravens.png";

const teamLogos = {
  bills, bengals, broncos, lions, colts,
  chiefs, raiders, rams, jets, eagles,
  steelers, "49ers": niners,
  ravens
};

export default function MatchupManager() {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);

  useEffect(() => {
    loadDivisions();
    loadNFLTeams();
  }, []);

  useEffect(() => {
    if (selectedDivision) {
      loadTeams();
      loadMatchups();
    }
  }, [selectedDivision]);

  const loadDivisions = async () => {
    const { data } = await supabase.from("teams").select("division");

    let unique = [...new Set(data.map(t => t.division).filter(Boolean))];

    unique = unique.sort((a, b) => {
      if (a === "K-1") return -1;
      if (b === "K-1") return 1;
      return a.localeCompare(b);
    });

    setDivisions(unique);
  };

  const loadNFLTeams = async () => {
    const { data } = await supabase.from("nfl_teams").select("*");
    setNflTeams(data || []);
  };

  const loadTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("division", selectedDivision);

    setTeams(data || []);
  };

  const loadMatchups = async () => {
    const { data } = await supabase
      .from("matchups")
      .select("*")
      .eq("division", selectedDivision)
      .order("week", { ascending: true });

    setMatchups(data || []);
  };

  /* ================= GENERATE MATCHUPS ================= */

  const generateMatchups = async () => {
    if (teams.length < 2) return alert("Not enough teams");

    await supabase.from("matchups").delete().eq("division", selectedDivision);

    let list = [...teams];
    const isOdd = list.length % 2 !== 0;

    if (isOdd) list.push({ id: "ghost" });

    const total = list.length;
    const rounds = total - 1;

    let schedule = [];

    for (let r = 0; r < rounds; r++) {
      let games = [];
      let used = new Set();

      for (let i = 0; i < total / 2; i++) {
        const home = list[i];
        const away = list[total - 1 - i];

        if (home.id !== "ghost" && away.id !== "ghost") {
          games.push({ home_team_id: home.id, away_team_id: away.id });
          used.add(home.id);
          used.add(away.id);
        }
      }

      // 🔥 odd team plays twice
      if (isOdd) {
        const missing = teams.find(t => !used.has(t.id));
        if (missing) {
          const opponent = teams.find(t => t.id !== missing.id);
          games.push({
            home_team_id: missing.id,
            away_team_id: opponent.id
          });
        }
      }

      schedule.push(games);

      const last = list.pop();
      list.splice(1, 0, last);
    }

    const final = [];

    for (let i = 0; i < 8; i++) {
      const weekGames = schedule[i % schedule.length];

      weekGames.forEach(g => {
        final.push({
          season_year: 2026,
          week: i + 1,
          division: selectedDivision,
          home_team_id: g.home_team_id,
          away_team_id: g.away_team_id
        });
      });
    }

    const { error } = await supabase.from("matchups").insert(final);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      loadMatchups();
    }
  };

  const getTeamDisplay = (id) => {
    const t = teams.find(x => x.id === id);
    if (!t) return null;

    const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

    return {
      name: nfl?.full_name,
      logo: teamLogos[nfl?.short_name]
    };
  };

  return (
    <div style={{ paddingBottom: 50 }}>

      <h1>Matchup Manager</h1>

      {/* ✅ label moved here */}
      <div style={divisionLabel}>Select Division</div>

      {/* DIVISIONS */}
      <div style={grid}>
        {divisions.map(d => (
          <div
            key={d}
            style={divisionTile(selectedDivision === d)}
            onClick={() => setSelectedDivision(d)}
          >
            {d}
          </div>
        ))}
      </div>

      {selectedDivision && (
        <>
          <h3 style={{ marginTop: 25 }}>{selectedDivision} Teams</h3>

          <div style={grid}>
            {teams.map(t => {
              const nfl = nflTeams.find(n => n.id === t.nfl_team_id);

              return (
                <div key={t.id} style={card}>
                  <img src={teamLogos[nfl?.short_name]} width={50}/>
                  <div>{nfl?.full_name}</div>
                </div>
              );
            })}
          </div>

          {matchups.length === 0 ? (
            <button style={btn} onClick={generateMatchups}>
              Generate 8 Week Matchups
            </button>
          ) : (
            <div style={{ marginTop: 25 }}>
              {[...new Set(matchups.map(m => m.week))].map(week => (
                <div key={week} style={weekBlock}>

                  <div style={weekHeader}>WEEK {week}</div>

                  <div style={matchGrid}>
                    {matchups
                      .filter(m => m.week === week)
                      .map(m => {
                        const home = getTeamDisplay(m.home_team_id);
                        const away = getTeamDisplay(m.away_team_id);

                        return (
                          <div key={m.id} style={matchCard}>

                            <div style={teamColumn}>
                              <div style={label}>HOME</div>
                              <img src={home?.logo} style={logo}/>
                              <div>{home?.name}</div>
                            </div>

                            <div style={vs}>VS</div>

                            <div style={teamColumn}>
                              <div style={label}>AWAY</div>
                              <img src={away?.logo} style={logo}/>
                              <div>{away?.name}</div>
                            </div>

                          </div>
                        );
                      })}
                  </div>

                </div>
              ))}
            </div>
          )}
        </>
      )}

    </div>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: 18,
  marginTop: 15
};

const divisionTile = (active) => ({
  background: active ? "#2f6ea6" : "#ffffff",
  color: active ? "#ffffff" : "#0f172a",
  borderRadius: 18,
  padding: 20,
  textAlign: "center",
  fontSize: 17,
  fontWeight: "600",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
});

const divisionLabel = {
  textAlign: "center",
  marginTop: 5,
  fontSize: 13,
  color: "#94a3b8"
};

/* 🔥 GLASS (WITH FALLBACK SO IT ALWAYS SHOWS) */
const matchCard = {
  background: "rgba(255,255,255,0.3)", // fallback
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.3)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.1)"
};

const matchGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 15,
  marginTop: 15
};

const weekBlock = {
  background: "#ffffff",
  padding: 20,
  borderRadius: 18,
  marginBottom: 25,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
};

const weekHeader = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 10
};

const teamColumn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "40%"
};

const logo = { width: 35 };

const label = { fontSize: 10, color: "#94a3b8" };

const vs = { fontWeight: "700" };

const card = {
  background: "#ffffff",
  borderRadius: 12,
  padding: 10,
  textAlign: "center"
};

const btn = {
  marginTop: 20,
  padding: "12px 18px",
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer"
};
