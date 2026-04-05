import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function MatchupManager() {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDivisions();
  }, []);

  const loadDivisions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("teams")
      .select("division");

    if (error) {
      console.error("Error loading divisions:", error);
      setLoading(false);
      return;
    }

    // ✅ Remove duplicates + clean list
    const uniqueDivisions = [
      ...new Set(
        data
          .map((t) => t.division)
          .filter((d) => d && d.trim() !== "")
      ),
    ].sort((a, b) => a.localeCompare(b));

    setDivisions(uniqueDivisions);
    setLoading(false);
  };

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      
      {/* ================= HEADER ================= */}
      <h1>Matchup Manager</h1>
      <p style={{ color: "#64748b" }}>
        Create and manage weekly matchups
      </p>

      {/* ================= LOADING ================= */}
      {loading && <p>Loading divisions...</p>}

      {/* ================= DIVISION TILES ================= */}
      {!loading && (
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

      {/* ================= CONTENT AREA ================= */}
      {selectedDivision && (
        <div style={{ marginTop: 30 }}>
          <h2>{selectedDivision} Matchups</h2>

          <div
            style={{
              marginTop: 15,
              padding: 20,
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
            }}
          >
            Select a week to begin managing matchups
          </div>
        </div>
      )}
    </div>
  );
}
