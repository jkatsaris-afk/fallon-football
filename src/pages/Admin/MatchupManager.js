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

  /* ================= LOAD DIVISIONS ================= */

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

  /* ================= LOAD NFL TEAMS ================= */

  const loadNFLTeams = async () => {
    const { data } = await supabase.from("nfl_teams").select("*");
    setNflTeams(data || []);
  };

  /* ================= LOAD TEAMS ================= */

  const loadTeams = async () => {
    const { data } = await supabase
      .from("teams")
      .select("*")
      .eq("division", selectedDivision);

    setTeams(data || []);
  };

  /* ================= LOAD MATCHUPS ================= */

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

    await supabase
      .from("matchups")
      .delete()
      .eq("division", selectedDivision);

    let list = [...teams];

    if (list.length % 2 !== 0) {
      list.push({ id: "bye" });
    }

    const totalTeams = list.length;
    const rounds = totalTeams - 1;

    let schedule = [];

    for (let round = 0; round < rounds; round++) {
      let weekGames = [];

      for (let i = 0; i < totalTeams / 2; i++) {
        const home = list[i];
        const away = list[totalTeams - 1 - i];

        if (home.id !== "bye" && away.id !== "bye") {
          weekGames.push({
            home_team_id: home.id,
            away_team_id: away.id
          });
        }
      }

      schedule.push(weekGames);

      const last = list.pop();
      list.splice(1, 0, last);
    }

    const finalSchedule = [];

    for (let i = 0; i < 8; i++) {
      const weekGames = schedule[i % schedule.length];

      weekGames.forEach(game => {
        finalSchedule.push({
          season_year: 2026,
          week: i + 1,
          division: selectedDivision,
          home_team_id: game.home_team_id,
          away_team_id: game.away_team_id
        });
      });
    }

    const { error } = await supabase
      .from("matchups")
      .insert(finalSchedule);

    if (error) {
      console.error(error);
      alert(error.message);
    } else {
      loadMatchups();
    }
  };

  /* ================= HELPERS ================= */

  const getTeamDisplay = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return null;

    const nfl = nflTeams.find(n => n.id === team.nfl_team_id);

    return {
      name: nfl?.full_name,
      logo: teamLogos[nfl?.short_name]
    };
  };

  /* ================= UI ================= */

  return (
    <div style={{ paddingBottom: 50 }}>

      <h1>Matchup Manager</h1>

      {/* DIVISIONS */}
      <div style={grid}>
        {divisions.map(d => (
          <div
            key={d}
            style={tile(selectedDivision === d)}
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
            <div style={{ marginTop: 20 }}>
              <h3>Matchups</h3>

              {[...new Set(matchups.map(m => m.week))].map(week => (
                <div key={week} style={weekBlock}>
                  <h4>Week {week}</h4>

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
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 15,
  marginTop: 15
};

const matchGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 15,
  marginTop: 10
};

const matchCard = {
  background: "rgba(255, 255, 255, 0.2)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  border: "1px solid rgba(255,255,255,0.25)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
};

const teamColumn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "40%",
  textAlign: "center"
};

const logo = {
  width: 35,
  height: 35,
  objectFit: "contain",
  margin: "4px 0"
};

const label = {
  fontSize: 10,
  color: "#94a3b8"
};

const vs = {
  fontWeight: "700",
  fontSize: 14
};

const tile = (active) => ({
  background: active ? "#2f6ea6" : "#fff",
  color: active ? "#fff" : "#000",
  borderRadius: 12,
  padding: 12,
  textAlign: "center",
  cursor: "pointer"
});

const card = {
  background: "#fff",
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

const weekBlock = {
  background: "rgba(255,255,255,0.25)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  padding: 18,
  borderRadius: 16,
  marginBottom: 20,
  border: "1px solid rgba(255,255,255,0.2)"
};
