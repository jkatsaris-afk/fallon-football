import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function CoachManager() {
  const [coaches, setCoaches] = useState([]);

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);

    setCoaches(data || []);
  };

  /* ================= HELPERS ================= */

  const getName = (c) => {
    return `${c.first_name || ""} ${c.last_name || ""}`.trim();
  };

  const getRole = (c) => {
    return c.role || (c.assistant_coach ? "assistant" : "coach");
  };

  const getStatus = (c) => {
    return c.status || "pending";
  };

  /* ================= UPDATE ================= */

  const updateStatus = async (id, status) => {
    await supabase
      .from("coaches")
      .update({ status })
      .eq("id", id);

    loadCoaches();
  };

  const updateRole = async (coach, newRole) => {
    await supabase
      .from("coaches")
      .update({
        role: newRole,
        assistant_coach: newRole === "assistant"
      })
      .eq("id", coach.id);

    loadCoaches();
  };

  /* ================= UI ================= */

  return (
    <div>

      <h1>Coach Manager</h1>

      <div style={table}>

        {/* HEADER */}
        <div style={rowHeader}>
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Division Pref</div>
          <div>Status</div>
          <div>Role</div>
          <div>Actions</div>
        </div>

        {/* ROWS */}
        {coaches.map(coach => (
          <div key={coach.id} style={row}>

            {/* NAME */}
            <div>{getName(coach)}</div>

            {/* EMAIL */}
            <div>{coach.email || "-"}</div>

            {/* PHONE */}
            <div>{coach.phone || "-"}</div>

            {/* DIVISION */}
            <div>{coach.division_preference || "-"}</div>

            {/* STATUS */}
            <div style={statusStyle(getStatus(coach))}>
              {getStatus(coach)}
            </div>

            {/* ROLE */}
            <div>
              <select
                value={getRole(coach)}
                onChange={(e) =>
                  updateRole(coach, e.target.value)
                }
              >
                <option value="assistant">Assistant</option>
                <option value="coach">Coach</option>
              </select>
            </div>

            {/* ACTIONS */}
            <div style={actions}>
              <button
                style={approveBtn}
                onClick={() => updateStatus(coach.id, "approved")}
              >
                Approve
              </button>

              <button
                style={denyBtn}
                onClick={() => updateStatus(coach.id, "denied")}
              >
                Deny
              </button>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const table = {
  marginTop: 20,
  background: "#fff",
  borderRadius: 12,
  overflow: "hidden"
};

const rowHeader = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 140px 120px 150px 200px",
  padding: 12,
  fontWeight: "600",
  background: "#f1f5f9"
};

const row = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 140px 120px 150px 200px",
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
  borderRadius: 6,
  cursor: "pointer"
};

const denyBtn = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer"
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
