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

    // ✅ FORCE K-1 FIRST
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

    // delete old
    await supabase
      .from("matchups")
      .delete()
      .eq("division", selectedDivision);

    let list = [...teams];

    // shuffle
    list.sort(() => Math.random() - 0.5);

    const weeks = 8;
    const newMatchups = [];

    for (let week = 1; week <= weeks; week++) {
      for (let i = 0; i < list.length / 2; i++) {
        newMatchups.push({
          season_year: 2026,
          week,
          division: selectedDivision,
          home_team_id: list[i].id,
          away_team_id: list[list.length - 1 - i].id
        });
      }

      // rotate
      const last = list.pop();
      list.splice(1, 0, last);
    }

    const { error } = await supabase.from("matchups").insert(newMatchups);

    if (error) {
      console.error("INSERT ERROR:", error);
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
    <div>

      <h1>Matchup Manager</h1>

      {/* ================= DIVISIONS ================= */}
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

      {/* ================= TEAMS ================= */}
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

          {/* ================= MATCHUPS ================= */}

          {matchups.length === 0 ? (
            <button style={btn} onClick={generateMatchups}>
              Generate 8 Week Matchups
            </button>
          ) : (
            <div style={{ marginTop: 20 }}>
              <h3>Matchups</h3>

              {/* GROUP BY WEEK */}
              {[...new Set(matchups.map(m => m.week))].map(week => (
                <div key={week} style={weekBlock}>
                  <h4>Week {week}</h4>

                  {matchups
                    .filter(m => m.week === week)
                    .map(m => {
                      const home = getTeamDisplay(m.home_team_id);
                      const away = getTeamDisplay(m.away_team_id);

                      return (
                        <div key={m.id} style={matchRow}>
                          <img src={home?.logo} width={30}/>
                          {home?.name}

                          <span style={{ margin: "0 10px" }}>vs</span>

                          {away?.name}
                          <img src={away?.logo} width={30}/>
                        </div>
                      );
                    })}
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
  background: "#fff",
  padding: 15,
  borderRadius: 12,
  marginBottom: 15
};

const matchRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: 8
};
