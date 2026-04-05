import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function PlayerManager() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("ALL");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: playerData } = await supabase
      .from("players")
      .select("*")
      .order("last_name");

    const { data: teamData } = await supabase
      .from("teams")
      .select("*");

    setPlayers(playerData || []);
    setTeams(teamData || []);
  };

  /* ================= UPDATE HANDLERS ================= */

  const updatePlayer = async (id, field, value) => {
    await supabase
      .from("players")
      .update({ [field]: value })
      .eq("id", id);

    loadData();
  };

  /* ================= DIVISIONS ================= */

  const divisions = [
    "ALL",
    ...new Set(players.map((p) => p.division).filter(Boolean))
  ];

  const filteredPlayers =
    selectedDivision === "ALL"
      ? players
      : players.filter((p) => p.division === selectedDivision);

  /* ================= UI ================= */

  return (
    <div style={{ padding: 20 }}>
      <h2>Player Manager</h2>

      {/* ================= DIVISION TILES ================= */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 20,
          flexWrap: "wrap"
        }}
      >
        {divisions.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDivision(d)}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              background:
                selectedDivision === d ? "#2f6ea6" : "#e2e8f0",
              color: selectedDivision === d ? "#fff" : "#0f172a",
              cursor: "pointer"
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* ================= PLAYER GRID ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 15,
          marginTop: 25,
          maxHeight: "75vh",
          overflowY: "auto"
        }}
      >
        {filteredPlayers.map((p) => {
          const playerTeam = teams.find((t) => t.id === p.team_id);

          return (
            <div
              key={p.id}
              style={{
                background: "#ffffff",
                borderRadius: 14,
                padding: 15,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
              }}
            >
              {/* NAME */}
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {p.first_name} {p.last_name}
              </div>

              {/* DIVISION */}
              <div style={{ marginTop: 10 }}>
                <label style={label}>Division</label>
                <input
                  value={p.division || ""}
                  onChange={(e) =>
                    updatePlayer(p.id, "division", e.target.value)
                  }
                  style={input}
                />
              </div>

              {/* SHIRT SIZE */}
              <div style={{ marginTop: 10 }}>
                <label style={label}>Shirt Size</label>
                <select
                  value={p.shirt_size || ""}
                  onChange={(e) =>
                    updatePlayer(p.id, "shirt_size", e.target.value)
                  }
                  style={input}
                >
                  <option value="">Select</option>
                  <option value="YS">YS</option>
                  <option value="YM">YM</option>
                  <option value="YL">YL</option>
                  <option value="AS">AS</option>
                  <option value="AM">AM</option>
                  <option value="AL">AL</option>
                </select>
              </div>

              {/* PAYMENT STATUS */}
              <div style={{ marginTop: 10 }}>
                <label style={label}>Payment</label>
                <select
                  value={p.payment_status || ""}
                  onChange={(e) =>
                    updatePlayer(p.id, "payment_status", e.target.value)
                  }
                  style={input}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {/* TEAM */}
              <div style={{ marginTop: 10 }}>
                <label style={label}>Team</label>
                <select
                  value={p.team_id || ""}
                  onChange={(e) =>
                    updatePlayer(p.id, "team_id", e.target.value)
                  }
                  style={input}
                >
                  <option value="">Unassigned</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.division})
                    </option>
                  ))}
                </select>

                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {playerTeam
                    ? `Current: ${playerTeam.name}`
                    : "No team assigned"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const label = {
  fontSize: 12,
  color: "#64748b"
};

const input = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  marginTop: 3
};
