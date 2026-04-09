import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

/* ================= MASTER DIVISIONS ================= */
const MASTER_DIVISIONS = [
  "K-1",
  "2nd-3rd",
  "4th-5th",
  "6th-8th"
];

export default function PlayerManager() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [divisionMap, setDivisionMap] = useState({}); // 🔥 NEW

  const [selectedDivision, setSelectedDivision] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: playerData } = await supabase
      .from("players")
      .select("*") // 🔥 removed join
      .order("last_name");

    const { data: teamData } = await supabase
      .from("teams")
      .select("*");

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("*");

    setPlayers(playerData || []);
    setTeams(teamData || []);

    // 🔥 Build map id → name
    const map = {};
    (divisionData || []).forEach(d => {
      map[d.id] = d.name;
    });

    setDivisionMap(map);

    const dbDivisions = (divisionData || []).map(d => d.name);
    const merged = [...new Set([...MASTER_DIVISIONS, ...dbDivisions])];

    setDivisions(merged);
  };

  /* ================= UPDATE ================= */

  const updatePlayer = async (id, field, value) => {
    await supabase
      .from("players")
      .update({ [field]: value })
      .eq("id", id);

    loadData();
  };

  const updateDivision = async (playerId, divisionName) => {
    const { data } = await supabase
      .from("divisions")
      .select("id")
      .eq("name", divisionName)
      .limit(1);

    if (!data || !data.length) return;

    await supabase
      .from("players")
      .update({ division_id: data[0].id })
      .eq("id", playerId);

    loadData();
  };

  /* ================= FILTER ================= */

  const filteredPlayers = players
    .filter(p =>
      selectedDivision === "ALL"
        ? true
        : divisionMap[p.division_id] === selectedDivision
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

      {/* ================= TOP BAR ================= */}
      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={searchInput}
        />

        {["ALL", ...divisions].map(d => (
          <button
            key={d}
            onClick={() => setSelectedDivision(d)}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              border: "none",
              background:
                selectedDivision === d ? "#2f6ea6" : "#e2e8f0",
              color: selectedDivision === d ? "#fff" : "#000",
              cursor: "pointer"
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* ================= TILE ================= */}
      <div style={tileWrapper}>

        {/* HEADER */}
        <div style={gridHeader}>
          <div style={cell}>Name</div>
          <div style={cell}>Age</div>
          <div style={cell}>Division</div>
          <div style={cell}>Shirt</div>
          <div style={cell}>Payment</div>
          <div style={cellLast}>Team</div>
        </div>

        {/* LIST */}
        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {filteredPlayers.map(p => {
            const playerTeam = teams.find(t => t.id === p.team_id);

            const currentDivision = divisionMap[p.division_id] || "";

            const divisionTeams = teams
              .filter(
                t =>
                  t.name &&
                  t.division === currentDivision
              )
              .sort((a, b) =>
                (a.name || "").localeCompare(b.name || "")
              );

            return (
              <div key={p.id} style={gridRow}>
                <div style={cell}>
                  {p.first_name} {p.last_name}
                </div>

                <div style={cell}>{p.age}</div>

                {/* 🔥 FIXED DIVISION */}
                <div style={cell}>
                  <select
                    value={currentDivision}
                    onChange={(e) =>
                      updateDivision(p.id, e.target.value)
                    }
                    style={input}
                  >
                    <option value="">Select</option>
                    {divisions.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={cell}>
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

                <div style={cell}>
                  <select
                    value={p.payment_status || ""}
                    onChange={(e) =>
                      updatePlayer(
                        p.id,
                        "payment_status",
                        e.target.value
                      )
                    }
                    style={input}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <div style={cellLast}>
                  <select
                    value={p.team_id || ""}
                    onChange={(e) =>
                      updatePlayer(p.id, "team_id", e.target.value)
                    }
                    style={teamSelect}
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
