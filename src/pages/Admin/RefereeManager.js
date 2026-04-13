import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefereeManager() {
  const [refs, setRefs] = useState([]);
  const [view, setView] = useState("dashboard"); // 🔥 NEW

  useEffect(() => {
    loadRefs();
  }, []);

  /* ================= LOAD ================= */

  const loadRefs = async () => {
    const { data } = await supabase
      .from("referees")
      .select("*")
      .order("first_name", { ascending: true });

    setRefs(data || []);
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

  /* ================= DASHBOARD ================= */

  if (view === "dashboard") {
    return (
      <div>

        <h1>Referee Manager</h1>

        <div style={grid}>

          <Tile
            title="Referee Staff"
            desc="View & approve referees"
            onClick={() => setView("staff")}
          />

          <Tile
            title="Schedules"
            desc="View referee assignments"
            onClick={() => setView("schedule")}
          />

          <Tile
            title="Head Ref Assign"
            desc="Assign head referees"
            onClick={() => setView("head")}
          />

          <Tile
            title="Time Sheets"
            desc="Track referee hours"
            onClick={() => setView("time")}
          />

        </div>

      </div>
    );
  }

  /* ================= STAFF TABLE ================= */

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

  /* ================= PLACEHOLDERS ================= */

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
  background: "#e5e7eb",
  cursor: "pointer"
};

/* ===== EXISTING TABLE STYLES (UNCHANGED) ===== */

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
