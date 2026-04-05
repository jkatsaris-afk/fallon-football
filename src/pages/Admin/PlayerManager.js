import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function PlayerManager() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("ALL");
  const [search, setSearch] = useState("");

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

  const updatePlayer = async (id, field, value) => {
    await supabase
      .from("players")
      .update({ [field]: value })
      .eq("id", id);

    loadData();
  };

  /* ================= DIVISIONS ================= */

  const divisions = [
    ...new Set(players.map((p) => p.division).filter(Boolean))
  ];

  const divisionOptions = ["", ...divisions];

  /* ================= FILTER ================= */

  const filteredPlayers = players
    .filter((p) =>
      selectedDivision === "ALL"
        ? true
        : p.division === selectedDivision
    )
    .filter((p) => {
      const team = teams.find((t) => t.id === p.team_id);
      const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
      const teamName = team?.name?.toLowerCase() || "";

      return (
        fullName.includes(search.toLowerCase()) ||
        teamName.includes(search.toLowerCase())
      );
    });

  return (
    <div style={{ padding: 20 }}>
      <h2>Player Manager</h2>

      {/* ================= TOP BAR ================= */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: 15,
          alignItems: "center",
          flexWrap: "wrap"
        }}
      >
        {/* SEARCH */}
        <input
          placeholder="Search players or teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        {/* DIVISION FILTER */}
        {["ALL", ...divisions].map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDivision(d)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              border: "none",
              background:
                selectedDivision === d ? "#2f6ea6" : "#e2e8f0",
              color: selectedDivision === d ? "#fff" : "#0f172a",
              cursor: "pointer"
            }}
          >
            {d || "No Division"}
          </button>
        ))}
      </div>

      {/* ================= TILE WRAPPER ================= */}
      <div style={tileWrapper}>

        {/* HEADER */}
        <div style={headerRow}>
          <div style={{ width: 180 }}>Name</div>
          <div style={{ width: 140 }}>Division</div>
          <div style={{ width: 120 }}>Shirt</div>
          <div style={{ width: 140 }}>Payment</div>
          <div style={{ flex: 1, maxWidth: 220 }}>Team</div>
        </div>

        {/* LIST */}
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {filteredPlayers.map((p) => {
            const playerTeam = teams.find((t) => t.id === p.team_id);

            const divisionTeams = teams
              .filter(
                (t) => !p.division || t.division === p.division
              )
              .sort((a, b) => a.name.localeCompare(b.name));

            return (
              <div key={p.id} style={row}>
                {/* NAME */}
                <div style={{ width: 180 }}>
                  {p.first_name} {p.last_name}
                </div>

                {/* DIVISION */}
                <div style={{ width: 140 }}>
                  <select
                    value={p.division || ""}
                    onChange={(e) =>
                      updatePlayer(p.id, "division", e.target.value)
                    }
                    style={input}
                  >
                    <option value="">Select</option>
                    {divisionOptions.map((d) => (
                      <option key={d} value={d}>
                        {d || "No Division"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SHIRT */}
                <div style={{ width: 120 }}>
                  <select
                    value={p.shirt_size || ""}
                    onChange={(e) =>
                      updatePlayer(p.id, "shirt_size", e.target.value)
                    }
                    style={input}
                  >
                    <option value="">-</option>
                    <option value="YS">YS</option>
                    <option value="YM">YM</option>
                    <option value="YL">YL</option>
                    <option value="AS">AS</option>
                    <option value="AM">AM</option>
                    <option value="AL">AL</option>
                  </select>
                </div>

                {/* PAYMENT */}
                <div style={{ width: 140 }}>
                  <select
                    value={p.payment_status || ""}
                    onChange={(e) =>
                      updatePlayer(p.id, "payment_status", e.target.value)
                    }
                    style={{
                      ...input,
                      background:
                        p.payment_status === "paid"
                          ? "#dcfce7"
                          : p.payment_status === "partial"
                          ? "#fef9c3"
                          : "#fee2e2"
                    }}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {/* TEAM (CLEAN VERSION) */}
                <div style={{ flex: 1, maxWidth: 220 }}>
                  <select
                    value={p.team_id || ""}
                    onChange={(e) =>
                      updatePlayer(p.id, "team_id", e.target.value)
                    }
                    style={selectClean}
                  >
                    <option value="">Unassigned</option>

                    {divisionTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}

                    {divisionTeams.length === 0 && (
                      <option disabled>No teams in division</option>
                    )}
                  </select>

                  <div style={teamLabel}>
                    {playerTeam
                      ? `Current: ${playerTeam.name}`
                      : "No team"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const tileWrapper = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 15,
  marginTop: 20,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const headerRow = {
  display: "flex",
  fontSize: 12,
  color: "#64748b",
  marginBottom: 8
};

const row = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9"
};

const input = {
  width: "100%",
  padding: "5px",
  borderRadius: 6,
  border: "1px solid #e5e7eb"
};

const selectClean = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: 13,
  cursor: "pointer"
};

const teamLabel = {
  fontSize: 11,
  color: "#64748b",
  marginTop: 2
};

const searchInput = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  width: 250
};
