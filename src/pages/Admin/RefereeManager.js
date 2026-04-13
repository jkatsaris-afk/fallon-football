import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefereeManager() {
  const [refs, setRefs] = useState([]);
  const [view, setView] = useState("dashboard");

  // 🔥 NEW STATE
  const [games, setGames] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    loadRefs();
    loadGames(); // 🔥 ADD
  }, []);

  /* ================= LOAD ================= */

  const loadRefs = async () => {
    const { data } = await supabase
      .from("referees")
      .select("*")
      .order("first_name", { ascending: true });

    setRefs(data || []);
  };

  const loadGames = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*")
      .order("event_date", { ascending: true });

    setGames(data || []);
  };

  const loadAssignments = async (gameId) => {
    const { data } = await supabase
      .from("ref_assignments")
      .select("*, referees(*)")
      .eq("game_id", gameId);

    setAssignments(data || []);
  };

  /* ================= HELPERS ================= */

  const getName = (r) =>
    `${r.first_name || ""} ${r.last_name || ""}`.trim();

  const getStatus = (r) => r.status || "pending";

  const getRole = (r) => {
    if (!r.role) return "assistant";
    return r.role.toLowerCase().includes("head") ? "head" : "assistant";
  };

  const displayRole = (r) => {
    if (!r.role) return "Assistant Ref";
    return r.role.toLowerCase().includes("head")
      ? "Head Ref"
      : "Assistant Ref";
  };

  /* ================= UPDATE ================= */

  const updateStatus = async (id, status) => {
    await supabase.from("referees").update({ status }).eq("id", id);
    loadRefs();
  };

  const updateRole = async (ref, newRole) => {
    await supabase
      .from("referees")
      .update({
        role: newRole === "head" ? "Head Ref" : "Assistant Ref"
      })
      .eq("id", ref.id);

    loadRefs();
  };

  // 🔥 HEAD REF ASSIGN
  const setHeadRef = async (assignmentId) => {
    if (!selectedGame) return;

    await supabase
      .from("ref_assignments")
      .update({ role: "assistant" })
      .eq("game_id", selectedGame.id);

    await supabase
      .from("ref_assignments")
      .update({ role: "head" })
      .eq("id", assignmentId);

    loadAssignments(selectedGame.id);
  };

  /* ================= DASHBOARD ================= */

  if (view === "dashboard") {
    return (
      <div>
        <h1>Referee Manager</h1>

        <div style={grid}>
          <Tile title="Referee Staff" desc="View & approve referees" onClick={() => setView("staff")} />
          <Tile title="Schedules" desc="View referee assignments" onClick={() => setView("schedule")} />
          <Tile title="Head Ref Assign" desc="Assign head referees" onClick={() => setView("head")} />
          <Tile title="Time Sheets" desc="Track referee hours" onClick={() => setView("time")} />
        </div>
      </div>
    );
  }

  /* ================= STAFF ================= */

  if (view === "staff") {
    return (
      <div>
        <BackBtn onClick={() => setView("dashboard")} />
        <h1>Referee Staff</h1>

        <div style={table}>
          <div style={rowHeader}>
            <div>Name</div>
            <div>Email</div>
            <div>Phone</div>
            <div>Status</div>
            <div>Role</div>
            <div>Actions</div>
          </div>

          {refs.map(ref => {
            const role = getRole(ref);

            return (
              <div key={ref.id} style={row}>
                <div>{getName(ref)}</div>
                <div>{ref.email || "-"}</div>
                <div>{ref.phone || "-"}</div>

                <div style={statusStyle(getStatus(ref))}>
                  {getStatus(ref)}
                </div>

                <div>
                  <select value={role} onChange={(e) => updateRole(ref, e.target.value)}>
                    <option value="assistant">Assistant Ref</option>
                    <option value="head">Head Ref</option>
                  </select>
                  <div style={roleText}>{displayRole(ref)}</div>
                </div>

                <div style={actions}>
                  <button style={approveBtn} onClick={() => updateStatus(ref.id, "approved")}>
                    Approve
                  </button>
                  <button style={denyBtn} onClick={() => updateStatus(ref.id, "denied")}>
                    Deny
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ================= HEAD REF ================= */

  if (view === "head") {
    return (
      <div>
        <BackBtn onClick={() => setView("dashboard")} />
        <h1>Head Ref Assignment</h1>

        <select
          style={select}
          value={selectedGame?.id || ""}
          onChange={(e) => {
            const game = games.find(g => g.id === e.target.value);
            setSelectedGame(game);
            loadAssignments(game.id);
          }}
        >
          <option value="">Select Game</option>
          {games.map(g => (
            <option key={g.id} value={g.id}>
              {g.home_team} vs {g.away_team} - {g.event_time}
            </option>
          ))}
        </select>

        {selectedGame && (
          <div style={{ marginTop: 20 }}>
            {assignments.map(a => {
              const isHead = a.role === "head";

              return (
                <div key={a.id} style={assignRow}>
                  <div>
                    {a.referees?.first_name} {a.referees?.last_name}
                  </div>

                  <button
                    style={isHead ? headBtn : assignBtn}
                    onClick={() => setHeadRef(a.id)}
                  >
                    {isHead ? "Head Ref" : "Make Head"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <BackBtn onClick={() => setView("dashboard")} />
      <h2>Coming Soon</h2>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Tile({ title, desc, onClick }) {
  return (
    <div onClick={onClick} style={tile}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div style={tileDesc}>{desc}</div>
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button style={backBtn} onClick={onClick}>
      ← Back
    </button>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 20,
  marginTop: 20
};

const tile = {
  background: "#fff",
  padding: 20,
  borderRadius: 14,
  cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const tileDesc = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 6
};

const backBtn = {
  marginBottom: 10,
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "#e5e7eb"
};

const select = {
  marginTop: 20,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ddd"
};

const assignRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: 12,
  background: "#fff",
  borderRadius: 10,
  marginBottom: 10
};

const assignBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 6
};

const headBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "6px 12px",
  borderRadius: 6
};

/* TABLE (unchanged) */

const table = {
  marginTop: 20,
  background: "#fff",
  borderRadius: 12,
  overflow: "hidden"
};

const rowHeader = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 120px 150px 200px",
  padding: 12,
  fontWeight: "600",
  background: "#f1f5f9"
};

const row = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 120px 150px 200px",
  padding: 12,
  borderTop: "1px solid #e5e7eb",
  alignItems: "center"
};

const actions = {
  display: "flex",
  gap: 10
};

const approveBtn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6
};

const denyBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6
};

const statusStyle = (s) => ({
  color:
    s === "approved"
      ? "#16a34a"
      : s === "denied"
      ? "#dc2626"
      : "#f59e0b",
  fontWeight: "600"
});

const roleText = {
  fontSize: 11,
  color: "#64748b",
  marginTop: 4
};
