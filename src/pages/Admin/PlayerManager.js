import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function PlayerManager() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [divisions, setDivisions] = useState([]);

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

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("*")
      .order("name");

    setPlayers(playerData || []);
    setTeams(teamData || []);

    // ✅ FALLBACK if divisions table empty
    if (!divisionData || divisionData.length === 0) {
      const fallback = [
        ...new Set(players.map(p => p.division).filter(Boolean))
      ];
      setDivisions(fallback.map(name => ({ name })));
    } else {
      setDivisions(divisionData);
    }
  };

  const updatePlayer = async (id, field, value) => {
    await supabase
      .from("players")
      .update({ [field]: value })
      .eq("id", id);

    loadData();
  };

  const filteredPlayers = players
    .filter(p =>
      selectedDivision === "ALL" ? true : p.division === selectedDivision
    )
    .filter(p => {
      const team = teams.find(t => t.id === p.team_id);
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

      {/* TOP BAR */}
      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        {["ALL", ...divisions.map(d => d.name)].map(d => (
          <button
            key={d}
            onClick={() => setSelectedDivision(d)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              border: "none",
              background:
                selectedDivision === d ? "#2f6ea6" : "#e2e8f0",
              color: selectedDivision === d ? "#fff" : "#000"
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* TILE */}
      <div style={tileWrapper}>

        {/* HEADER */}
        <div style={gridHeader}>
          <div>Name</div>
          <div>Age</div>
          <div>Division</div>
          <div>Shirt</div>
          <div>Payment</div>
          <div>Team</div>
        </div>

        {/* LIST */}
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {filteredPlayers.map(p => {
            const playerTeam = teams.find(t => t.id === p.team_id);

            const divisionTeams = teams
              .filter(
                t =>
                  t.name &&
                  (!p.division || t.division === p.division)
              )
              .sort((a, b) =>
                (a.name || "").localeCompare(b.name || "")
              );

            return (
              <div key={p.id} style={gridRow}>
                <div>{p.first_name} {p.last_name}</div>

                <div>{p.age}</div>

                {/* DIVISION */}
                <div>
                  <select
                    value={p.division || ""}
                    onChange={e =>
                      updatePlayer(p.id, "division", e.target.value)
                    }
                    style={input}
                  >
                    <option value="">Select</option>
                    {divisions.map(d => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SHIRT */}
                <div>
                  <select
                    value={p.shirt_size || ""}
                    onChange={e =>
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
                <div>
                  <select
                    value={p.payment_status || ""}
                    onChange={e =>
                      updatePlayer(
                        p.id,
                        "payment_status",
                        e.target.value
                      )
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

                {/* TEAM */}
                <div>
                  <select
                    value={p.team_id || ""}
                    onChange={e =>
                      updatePlayer(p.id, "team_id", e.target.value)
                    }
                    style={input}
                  >
                    <option value="">Unassigned</option>
                    {divisionTeams.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <div style={teamLabel}>
                    {playerTeam?.name || "No team"}
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
  background: "#fff",
  borderRadius: 16,
  padding: 15,
  marginTop: 20,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const gridHeader = {
  display: "grid",
  gridTemplateColumns: "180px 60px 160px 120px 140px 1fr",
  fontSize: 12,
  color: "#64748b",
  paddingBottom: 6,
  borderBottom: "1px solid #e5e7eb"
};

const gridRow = {
  display: "grid",
  gridTemplateColumns: "180px 60px 160px 120px 140px 1fr",
  alignItems: "center",
  gap: 10,
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9"
};

const input = {
  width: "100%",
  height: 32,
  padding: "4px 8px",
  borderRadius: 6,
  border: "1px solid #e5e7eb"
};

const teamLabel = {
  fontSize: 11,
  color: "#64748b"
};

const searchInput = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb"
};
