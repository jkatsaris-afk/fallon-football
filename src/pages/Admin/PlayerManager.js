import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { applyPersonSeasonFilter, getActiveSeason } from "../../utils/season";

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
  const [divisionMap, setDivisionMap] = useState({});

  const [selectedDivision, setSelectedDivision] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [status, setStatus] = useState("");

  // 🔥 NEW
  const [unassignedCounts, setUnassignedCounts] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const active = await getActiveSeason();

    const { data: playerData } = await applyPersonSeasonFilter(supabase
      .from("players")
      .select("*")
      .order("last_name"), active);

    const { data: teamData } = await applyPersonSeasonFilter(supabase
      .from("teams")
      .select("*"), active);

    const { data: divisionData } = await supabase
      .from("divisions")
      .select("*");

    setPlayers(playerData || []);
    setTeams(teamData || []);

    const map = {};
    (divisionData || []).forEach(d => {
      map[d.id] = d.name;
    });

    setDivisionMap(map);

    const dbDivisions = (divisionData || []).map(d => d.name);
    const merged = [...new Set([...MASTER_DIVISIONS, ...dbDivisions])];

    setDivisions(merged);

    // 🔥 NEW — COUNT UNASSIGNED
    const counts = {};

    (playerData || []).forEach(p => {
      if (!p.team_id) {
        const divisionName = map[p.division_id] || "Unassigned";
        counts[divisionName] = (counts[divisionName] || 0) + 1;
      }
    });

    setUnassignedCounts(counts);
  };

  /* ================= UPDATE ================= */

  const updatePlayer = async (id, field, value) => {
    await supabase
      .from("players")
      .update({ [field]: value })
      .eq("id", id);

    loadData();
  };

  const deletePlayer = async () => {
    if (!pendingDelete) return;

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", pendingDelete.id);

    if (error) {
      console.error("Player delete failed:", error);
      setStatus(`Player could not be deleted: ${error.message}`);
      return;
    }

    setStatus(`${pendingDelete.first_name} ${pendingDelete.last_name} was deleted.`);
    setPendingDelete(null);
    loadData();
  };

  const updatePlayerRating = async (id, value) => {
    await supabase
      .from("players")
      .update({
        rating: value,
        rank_score: value,
      })
      .eq("id", id);

    loadData();
  };

  const updateDivision = async (playerId, divisionName) => {
    const { data: divisionData } = await supabase
      .from("divisions")
      .select("id")
      .eq("name", divisionName)
      .limit(1);

    if (!divisionData || !divisionData.length) return;

    const divisionId = divisionData[0].id;

    setPlayers(prev =>
      prev.map(p =>
        p.id === playerId
          ? { ...p, division_id: divisionId }
          : p
      )
    );

    const { error } = await supabase
      .from("players")
      .update({ division_id: divisionId })
      .eq("id", playerId);

    if (error) {
      console.error("DB UPDATE FAILED:", error);
      alert("Database update failed — check console");
      return;
    }

    loadData();
  };

  /* ================= FILTER ================= */

  const filteredPlayers = players
    .filter(p =>
      showUnassignedOnly
        ? !p.team_id
        : selectedDivision === "ALL"
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
      {status && <div style={statusBox}>{status}</div>}

      {/* 🔥 NEW TILE ROW */}
      <div style={tileGrid}>
        {["K-1","2nd-3rd","4th-5th","6th-8th"].map(d => (
          <div key={d} style={tile}>
            <div style={tileTitle}>{d}</div>
            <div style={tileValue}>
              {unassignedCounts[d] || 0}
            </div>
            <div style={tileSub}>Unassigned</div>
          </div>
        ))}
        <button
          type="button"
          style={{ ...tile, ...(showUnassignedOnly ? activeTile : {}) }}
          onClick={() => setShowUnassignedOnly((current) => !current)}
        >
          <div style={tileTitle}>All Divisions</div>
          <div style={tileValue}>
            {players.filter((player) => !player.team_id).length}
          </div>
          <div style={tileSub}>Unassigned List</div>
        </button>
      </div>

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
            onClick={() => {
              setSelectedDivision(d);
              setShowUnassignedOnly(false);
            }}
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

        {showUnassignedOnly && (
          <button
            type="button"
            onClick={() => setShowUnassignedOnly(false)}
            style={clearBtn}
          >
            Clear Unassigned
          </button>
        )}
      </div>

      {showUnassignedOnly && (
        <div style={unassignedBanner}>
          Showing players with no team assignment. Delete is available here so old or duplicate signups can be cleaned up.
        </div>
      )}

      {pendingDelete && (
        <div style={confirmBox}>
          <div>
            <strong>Delete {pendingDelete.first_name} {pendingDelete.last_name}?</strong>
            <div style={confirmText}>This removes the player record from the active player list.</div>
          </div>
          <div style={confirmActions}>
            <button type="button" style={deleteConfirmBtn} onClick={deletePlayer}>Delete Player</button>
            <button type="button" style={cancelBtn} onClick={() => setPendingDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ================= TABLE ================= */}
      <div style={tileWrapper}>
        <div style={gridHeader}>
  <div style={cell}>Name</div>
  <div style={cell}>Age</div>
  <div style={cell}>Division</div>
  <div style={cell}>Rating</div>
  <div style={cell}>Shirt</div>
  <div style={cell}>Payment</div>
  <div style={cellLast}>Team</div>
  <div style={cellLast}>Actions</div>
</div>

        <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
          {filteredPlayers.map(p => {
            const playerTeam = teams.find(t => t.id === p.team_id);
            const currentDivision = divisionMap[p.division_id] || "";

            const divisionTeams = teams
              .filter(t => t.name && t.division === currentDivision)
              .sort((a, b) =>
                (a.name || "").localeCompare(b.name || "")
              );

            return (
              <div key={p.id} style={gridRow}>
                <div style={cell}>
                  {p.first_name} {p.last_name}
                </div>

                <div style={cell}>{p.age}</div>

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
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div style={cell}>
                  <select
                    value={p.rating || p.rank_score || 3}
                    onChange={(e) => updatePlayerRating(p.id, Number(e.target.value))}
                    style={input}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <option key={rating} value={rating}>{rating}</option>
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
                      updatePlayer(p.id, "payment_status", e.target.value)
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
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <div style={teamLabel}>
                    {playerTeam?.name || "No team"}
                  </div>
                </div>

                <div style={cellLast}>
                  {!p.team_id ? (
                    <button
                      type="button"
                      style={deleteBtn}
                      onClick={() => setPendingDelete(p)}
                    >
                      Delete
                    </button>
                  ) : (
                    <span style={lockedText}>Assigned</span>
                  )}
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

const searchInput = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb"
};

const statusBox = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: 12,
  color: "#1e3a8a",
  fontSize: 13,
  fontWeight: 800,
  marginTop: 10,
  padding: 12,
};

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 15,
  marginTop: 15
};

const tile = {
  background: "#fff",
  border: "none",
  borderRadius: 12,
  padding: 15,
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  textAlign: "center",
  cursor: "pointer"
};

const activeTile = {
  outline: "2px solid #16a34a",
  boxShadow: "0 10px 24px rgba(22,163,74,0.14)",
};

const tileTitle = { fontSize: 13, color: "#64748b" };
const tileValue = { fontSize: 24, fontWeight: "700", marginTop: 5 };
const tileSub = { fontSize: 11, color: "#94a3b8", marginTop: 4 };

const tileWrapper = {
  background: "#fff",
  borderRadius: 16,
  padding: 15,
  marginTop: 20,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const clearBtn = {
  background: "#0f172a",
  border: "none",
  borderRadius: 20,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 850,
  padding: "6px 12px",
};

const unassignedBanner = {
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: 12,
  color: "#92400e",
  fontSize: 13,
  fontWeight: 800,
  marginTop: 12,
  padding: 12,
};

const confirmBox = {
  alignItems: "center",
  background: "#fff",
  border: "1px solid #fecaca",
  borderRadius: 14,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  display: "flex",
  gap: 12,
  justifyContent: "space-between",
  marginTop: 12,
  padding: 12,
};

const confirmText = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 750,
  marginTop: 3,
};

const confirmActions = {
  display: "flex",
  gap: 8,
};

const deleteConfirmBtn = {
  background: "#dc2626",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  padding: "9px 11px",
};

const cancelBtn = {
  background: "#e2e8f0",
  border: "none",
  borderRadius: 10,
  color: "#0f172a",
  cursor: "pointer",
  fontWeight: 900,
  padding: "9px 11px",
};

const gridHeader = {
  display: "grid",
  gridTemplateColumns: "180px 60px 160px 90px 120px 140px 1fr 100px",
  borderBottom: "1px solid #e5e7eb"
};

const gridRow = {
  display: "grid",
  gridTemplateColumns: "180px 60px 160px 90px 120px 140px 1fr 100px",
  alignItems: "center",
  borderBottom: "1px solid #f1f5f9"
};

const cell = {
  padding: "8px 10px",
  borderRight: "1px solid #e5e7eb",
  display: "flex",
  alignItems: "center"
};

const cellLast = {
  padding: "8px 10px",
  display: "flex",
  flexDirection: "column"
};

const input = {
  width: "100%",
  height: 32,
  borderRadius: 6,
  border: "1px solid #e5e7eb"
};

const teamSelect = {
  width: "100%",
  maxWidth: 180,
  height: 32,
  borderRadius: 6,
  border: "1px solid #e5e7eb",
  background: "#f8fafc"
};

const teamLabel = {
  fontSize: 11,
  color: "#64748b"
};

const deleteBtn = {
  background: "#fee2e2",
  border: "none",
  borderRadius: 9,
  color: "#991b1b",
  cursor: "pointer",
  fontWeight: 900,
  padding: "8px 10px",
};

const lockedText = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
};
