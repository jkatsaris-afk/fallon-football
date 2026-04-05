import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefereeManager() {
  const [refs, setRefs] = useState([]);

  useEffect(() => {
    loadRefs();
  }, []);

  /* ================= LOAD ================= */

  const loadRefs = async () => {
    const { data, error } = await supabase
      .from("referees")
      .select("*")
      .order("first_name", { ascending: true })
      .order("last_name", { ascending: true });

    if (error) console.error(error);

    setRefs(data || []);
  };

  /* ================= HELPERS ================= */

  const getName = (r) => {
    return `${r.first_name || ""} ${r.last_name || ""}`.trim();
  };

  const getRole = (r) => {
    if (!r.role) return "assistant";

    const role = r.role.toLowerCase();

    if (role.includes("head")) return "head";
    if (role.includes("assistant")) return "assistant";

    return "assistant";
  };

  const displayRole = (r) => {
    if (!r.role) return "Assistant Ref";

    const role = r.role.toLowerCase();

    if (role.includes("head")) return "Head Ref";
    if (role.includes("assistant")) return "Assistant Ref";

    return r.role;
  };

  const getStatus = (r) => {
    return r.status || "pending";
  };

  /* ================= UPDATE ================= */

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from("referees")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Failed to update status");
      return;
    }

    loadRefs();
  };

  const updateRole = async (ref, newRole) => {
    const { error } = await supabase
      .from("referees")
      .update({
        role: newRole === "head" ? "Head Ref" : "Assistant Ref"
      })
      .eq("id", ref.id);

    if (error) {
      console.error(error);
      alert("Failed to update role");
      return;
    }

    loadRefs();
  };

  /* ================= UI ================= */

  return (
    <div>

      <h1>Referee Manager</h1>

      <div style={table}>

        {/* HEADER */}
        <div style={rowHeader}>
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Status</div>
          <div>Role</div>
          <div>Actions</div>
        </div>

        {/* ROWS */}
        {refs.map(ref => {
          const role = getRole(ref);

          return (
            <div key={ref.id} style={row}>

              {/* NAME */}
              <div>{getName(ref)}</div>

              {/* EMAIL */}
              <div>{ref.email || "-"}</div>

              {/* PHONE */}
              <div>{ref.phone || "-"}</div>

              {/* STATUS */}
              <div style={statusStyle(getStatus(ref))}>
                {getStatus(ref)}
              </div>

              {/* ROLE */}
              <div>
                <select
                  value={role}
                  onChange={(e) =>
                    updateRole(ref, e.target.value)
                  }
                >
                  <option value="assistant">Assistant Ref</option>
                  <option value="head">Head Ref</option>
                </select>

                <div style={roleText}>
                  {displayRole(ref)}
                </div>
              </div>

              {/* ACTIONS */}
              <div style={actions}>
                <button
                  style={approveBtn}
                  onClick={() => updateStatus(ref.id, "approved")}
                >
                  Approve
                </button>

                <button
                  style={denyBtn}
                  onClick={() => updateStatus(ref.id, "denied")}
                >
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

/* ================= STYLES ================= */

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

const roleText = {
  fontSize: 11,
  color: "#64748b",
  marginTop: 4
};
