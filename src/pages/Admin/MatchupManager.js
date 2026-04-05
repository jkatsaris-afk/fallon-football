import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

/* ================= LOGOS (MATCH TEAMS PAGE) ================= */

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

    let unique = [
      ...new Set(data.map(t => t.division).filter(Boolean))
    ];

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

    // 🔥 DELETE OLD FIRST
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
          home_team: list[i].name,
          away_team: list[list.length - 1 - i].name
        });
      }

      // rotate
      const last = list.pop();
      list.splice(1, 0, last);
    }

    await supabase.from("matchups").insert(newMatchups);

    loadMatchups();
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
                  <img
                    src={teamLogos[nfl?.short_name]}
                    width={50}
                  />
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

              {matchups.map(m => (
                <div key={m.id} style={matchRow}>
                  Week {m.week}: {m.home_team} vs {m.away_team}
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

const matchRow = {
  background: "#fff",
  padding: 10,
  borderRadius: 8,
  marginBottom: 6
};
