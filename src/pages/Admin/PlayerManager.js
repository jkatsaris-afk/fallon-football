import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function PlayerManager() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: playerData } = await supabase
      .from("players")
      .select("*")
      .order("name");

    const { data: teamData } = await supabase
      .from("teams")
      .select("*")
      .order("name");

    setPlayers(playerData || []);
    setTeams(teamData || []);
  };

  const removePlayer = async (id) => {
    await supabase.from("players").delete().eq("id", id);
    loadData();
  };

  const movePlayer = async (id, team_id) => {
    await supabase
      .from("players")
      .update({ team_id })
      .eq("id", id);

    loadData();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Player Manager</h2>

      <div style={{ overflowY: "auto", maxHeight: "80vh", marginTop: 20 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th>Name</th>
              <th>Team</th>
              <th>Move</th>
              <th>Remove</th>
            </tr>
          </thead>

          <tbody>
            {players.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td>{p.name}</td>

                <td>
                  {teams.find((t) => t.id === p.team_id)?.name || "Unassigned"}
                </td>

                <td>
                  <select
                    value={p.team_id || ""}
                    onChange={(e) => movePlayer(p.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  <button
                    onClick={() => removePlayer(p.id)}
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer"
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
