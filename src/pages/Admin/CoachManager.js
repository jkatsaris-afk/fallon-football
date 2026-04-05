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

    console.log("Coaches:", data); // 🔥 DEBUG (remove later)

    setCoaches(data || []);
  };

  /* ================= UPDATE ================= */

  const updateStatus = async (id, status) => {
    await supabase
      .from("coaches")
      .update({ status })
      .eq("id", id);

    loadCoaches();
  };

  const updateRole = async (id, role) => {
    await supabase
      .from("coaches")
      .update({ role })
      .eq("id", id);

    loadCoaches();
  };

  /* ================= HELPERS ================= */

  const getName = (coach) => {
    return (
      `${coach.first_name || coach.name || ""} ${coach.last_name || ""}`.trim()
    );
  };

  const getEmail = (coach) => {
    return coach.email || coach.email_address || "";
  };

  const getRole = (coach) => {
    return coach.role || "assistant"; // fallback
  };

  const getStatus = (coach) => {
    return coach.status || "pending";
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
          <div>Status</div>
          <div>Role</div>
          <div>Actions</div>
        </div>

        {/* ROWS */}
        {coaches.map(coach => (
          <div key={coach.id} style={row}>

            <div>{getName(coach)}</div>

            <div>{getEmail(coach)}</div>

            {/* STATUS */}
            <div style={statusStyle(getStatus(coach))}>
              {getStatus(coach)}
            </div>

            {/* ROLE DROPDOWN */}
            <div>
              <select
                value={getRole(coach)}
                onChange={(e) =>
                  updateRole(coach.id, e.target.value)
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
  gridTemplateColumns: "1fr 1fr 120px 150px 200px",
  padding: 12,
  fontWeight: "600",
  background: "#f1f5f9"
};

const row = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 120px 150px 200px",
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
