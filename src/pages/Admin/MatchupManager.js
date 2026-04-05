import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function MatchupManager() {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDivisions();
  }, []);

  useEffect(() => {
    if (selectedDivision) {
      loadTeams();
    }
  }, [selectedDivision]);

  // ================= LOAD DIVISIONS =================
  const loadDivisions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("teams")
      .select("division");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    let unique = [
      ...new Set(
        data.map((t) => t.division).filter(Boolean)
      ),
    ];

    // ✅ Move Kinder (K-1) to front
    unique = unique.sort((a, b) => {
      if (a.toLowerCase().includes("k")) return -1;
      if (b.toLowerCase().includes("k")) return 1;
      return a.localeCompare(b);
    });

    setDivisions(unique);
    setLoading(false);
  };

  // ================= LOAD TEAMS =================
  const loadTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("division", selectedDivision)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setTeams(data);
  };

  // ================= GENERATE MATCHUPS =================
  const generateMatchups = async () => {
    if (teams.length < 2) {
      alert("Not enough teams");
      return;
    }

    let teamList = [...teams];

    // Shuffle teams
    teamList.sort(() => Math.random() - 0.5);

    const weeks = 8;
    const matchups = [];

    for (let week = 1; week <= weeks; week++) {
      for (let i = 0; i < teamList.length / 2; i++) {
        const home = teamList[i];
        const away = teamList[teamList.length - 1 - i];

        matchups.push({
          season_year: 2026,
          week,
          division: selectedDivision,
          home_team: home.name,
          away_team: away.name,
        });
      }

      // Rotate teams (round robin logic)
      const last = teamList.pop();
      teamList.splice(1, 0, last);
    }

    // Save to DB
    const { error } = await supabase.from("matchups").insert(matchups);

    if (error) {
      console.error(error);
      alert("Error saving matchups");
    } else {
      alert("Matchups generated!");
    }
  };

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      
      <h1>Matchup Manager</h1>
      <p style={{ color: "#64748b" }}>
        Create and manage weekly matchups
      </p>

      {/* ================= DIVISION TILES ================= */}
      {loading ? (
        <p>Loading divisions...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 15,
            marginTop: 20
          }}
        >
          {divisions.map((division) => (
            <div
              key={division}
              onClick={() => setSelectedDivision(division)}
              style={{
                padding: 20,
                borderRadius: 14,
                background:
                  selectedDivision === division ? "#2f6ea6" : "#ffffff",
                color:
                  selectedDivision === division ? "#ffffff" : "#0f172a",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                textAlign: "center",
                fontWeight: "600"
              }}
            >
              {division}
            </div>
          ))}
        </div>
      )}

      {/* ================= TEAM LIST ================= */}
      {selectedDivision && (
        <div style={{ marginTop: 30 }}>
          <h2>{selectedDivision} Teams</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginTop: 15
            }}
          >
            {teams.map((team) => (
              <div
                key={team.id}
                style={{
                  padding: 12,
                  background: "#ffffff",
                  borderRadius: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                  textAlign: "center"
                }}
              >
                {team.name}
              </div>
            ))}
          </div>

          {/* ================= GENERATE BUTTON ================= */}
          <div style={{ marginTop: 25 }}>
            <button
              onClick={generateMatchups}
              style={{
                padding: "14px 20px",
                borderRadius: 10,
                border: "none",
                background: "#2f6ea6",
                color: "#fff",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Generate 8 Week Matchups
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
