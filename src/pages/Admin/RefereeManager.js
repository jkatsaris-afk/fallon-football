import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

import RefereeStaffPage from "./RefereeManagerPages/RefereeStaffPage";
import RefereeSchedulePage from "./RefereeManagerPages/RefereeSchedulePage";
import RefereeTimeSheetsPage from "./RefereeManagerPages/RefereeTimeSheetsPage";

// 🔥 REPLACED HeadRefPage
import AutoAssignPage from "./RefereeManagerPages/AutoAssignPage";

export default function RefereeManager() {
  const [refs, setRefs] = useState([]);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRefs();
  }, []);

  const loadRefs = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("referees")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error loading referees:", error);
      setRefs([]);
      setLoading(false);
      return;
    }

    setRefs(data || []);
    setLoading(false);
  };

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

  const updateStatus = async (id, status) => {
    await supabase.from("referees").update({ status }).eq("id", id);
    loadRefs();
  };

  const updateRole = async (ref, newRole) => {
    await supabase
      .from("referees")
      .update({
        role: newRole === "head" ? "Head Ref" : "Assistant Ref",
      })
      .eq("id", ref.id);

    loadRefs();
  };

  const renderSelectedPage = () => {
    try {
      switch (view) {
        case "staff":
          return (
            <RefereeStaffPage
              refs={refs}
              loading={loading}
              getName={getName}
              getStatus={getStatus}
              getRole={getRole}
              displayRole={displayRole}
              updateStatus={updateStatus}
              updateRole={updateRole}
            />
          );

        case "schedule":
          return <RefereeSchedulePage />;

        case "autoAssign":
          return <AutoAssignPage />;

        case "time":
          return <RefereeTimeSheetsPage />;

        default:
          return (
            <div style={contentWrap}>
              <div style={emptyStateCard}>
                <div style={emptyTitle}>Referee Manager</div>
                <div style={emptyText}>
                  Pick a tile above to manage referee staff, schedules, and time sheets.
                </div>
              </div>
            </div>
          );
      }
    } catch (err) {
      console.error("Referee Manager crash:", err);
      return (
        <div style={{ padding: 20, color: "red" }}>
          ⚠️ Page crashed — check console
        </div>
      );
    }
  };

  return (
    <div style={pageWrap}>
      <div style={topSection}>
        <div style={titleRow}>
          <div>
            <h1 style={title}>Referee Manager</h1>
            <div style={subtitle}>
              Manage referee staff, assignments, and payroll items.
            </div>
          </div>
        </div>

        <div style={tileGrid}>
          <ManagerTile
            title="Referee Staff"
            desc="View, approve, and assign roles"
            active={view === "staff"}
            onClick={() => setView("staff")}
          />

          <ManagerTile
            title="Schedules"
            desc="Referee assignments and games"
            active={view === "schedule"}
            onClick={() => setView("schedule")}
          />

          {/* 🔥 REPLACED TILE */}
          <ManagerTile
            title="Auto Assign Wizard"
            desc="Automatically assign referees"
            active={view === "autoAssign"}
            onClick={() => setView("autoAssign")}
          />

          <ManagerTile
            title="Time Sheets"
            desc="Track hours and payments"
            active={view === "time"}
            onClick={() => setView("time")}
          />
        </div>
      </div>

      {renderSelectedPage()}
    </div>
  );
}

/* 🔥 UI (RESTORED — THIS FIXES YOUR ERROR) */

function ManagerTile({ title, desc, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tile,
        ...(active ? activeTile : {}),
      }}
    >
      <div style={tileTitle}>{title}</div>
      <div style={tileDesc}>{desc}</div>
    </button>
  );
}

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
};

const topSection = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const titleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const title = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 700,
  color: "#0f172a",
};

const subtitle = {
  marginTop: 6,
  color: "#64748b",
  fontSize: "14px",
};

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const tile = {
  textAlign: "left",
  border: "none",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  minHeight: 100,
};

const activeTile = {
  outline: "2px solid #16a34a",
  boxShadow: "0 10px 28px rgba(22, 163, 74, 0.16)",
};

const tileTitle = {
  fontSize: "16px",
  fontWeight: 700,
  color: "#0f172a",
};

const tileDesc = {
  marginTop: 8,
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.4,
};

const contentWrap = {
  display: "flex",
  flexDirection: "column",
};

const emptyStateCard = {
  background: "#ffffff",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

const emptyTitle = {
  fontSize: "20px",
  fontWeight: 700,
  color: "#0f172a",
};

const emptyText = {
  marginTop: 8,
  color: "#64748b",
  fontSize: "14px",
};
