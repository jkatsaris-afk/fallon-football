import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

import RefereeStaffPage from "./RefereeManagerPages/RefereeStaffPage";
import RefereeSchedulePage from "./RefereeManagerPages/RefereeSchedulePage";
import HeadRefPage from "./RefereeManagerPages/HeadRefPage";
import RefereeTimeSheetsPage from "./RefereeManagerPages/RefereeTimeSheetsPage";
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

  const setHeadRef = async (refId) => {
    await supabase.from("referees").update({ is_head_ref: false }).neq("id", "");
    await supabase.from("referees").update({ is_head_ref: true }).eq("id", refId);
    loadRefs();
  };

  const renderSelectedPage = () => {
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

      case "head":
        return (
          <HeadRefPage
            refs={refs}
            loading={loading}
            getName={getName}
            getStatus={getStatus}
            setHeadRef={setHeadRef}
          />
        );

      case "time":
        return <RefereeTimeSheetsPage />;

      case "autoAssign":
        return <AutoAssignPage />;

      default:
        return (
          <div style={contentWrap}>
            <div style={emptyStateCard}>
              <div style={emptyTitle}>Referee Manager</div>
              <div style={emptyText}>
                Pick a tile above to manage referee staff, schedules, head ref,
                and time sheets.
              </div>
            </div>
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
              Manage referee staff, assignments, leadership, and payroll items.
            </div>
          </div>
        </div>

        <div style={tileGrid}>
          <ManagerTile title="Referee Staff" active={view==="staff"} onClick={()=>setView("staff")} />
          <ManagerTile title="Schedules" active={view==="schedule"} onClick={()=>setView("schedule")} />
          <ManagerTile title="Auto Assign Wizard" active={view==="autoAssign"} onClick={()=>setView("autoAssign")} />
          <ManagerTile title="Head Ref" active={view==="head"} onClick={()=>setView("head")} />
          <ManagerTile title="Time Sheets" active={view==="time"} onClick={()=>setView("time")} />
        </div>
      </div>

      {renderSelectedPage()}
    </div>
  );
}

/* 🔥 TILE COMPONENT */
function ManagerTile({ title, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        borderRadius: 16,
        background: active ? "#16a34a" : "#fff",
        color: active ? "#fff" : "#111",
        cursor: "pointer",
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        fontWeight: 700,
        textAlign: "center"
      }}
    >
      {title}
    </div>
  );
}

/* 🔥 STYLES */
const pageWrap = { padding: 20 };
const topSection = { marginBottom: 20 };
const titleRow = { marginBottom: 10 };
const title = { fontSize: 24, fontWeight: 800 };
const subtitle = { fontSize: 14, color: "#64748b" };

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
  gap: 12
};

const contentWrap = { padding: 20 };

const emptyStateCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 16
};

const emptyTitle = { fontSize: 18, fontWeight: 800 };
const emptyText = { fontSize: 14, color: "#64748b" };
