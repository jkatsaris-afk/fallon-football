import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

import RefereeStaffPage from "./RefereeManagerPages/RefereeStaffPage";
import RefereeSchedulePage from "./RefereeManagerPages/RefereeSchedulePage";
import HeadRefPage from "./RefereeManagerPages/HeadRefPage";
import RefereeTimeSheetsPage from "./RefereeManagerPages/RefereeTimeSheetsPage";

// 🔥 ADDED
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
    const { error } = await supabase
      .from("referees")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating referee status:", error);
      return;
    }

    loadRefs();
  };

  const updateRole = async (ref, newRole) => {
    const { error } = await supabase
      .from("referees")
      .update({
        role: newRole === "head" ? "Head Ref" : "Assistant Ref",
      })
      .eq("id", ref.id);

    if (error) {
      console.error("Error updating referee role:", error);
      return;
    }

    loadRefs();
  };

  const setHeadRef = async (refId) => {
    const { error: clearError } = await supabase
      .from("referees")
      .update({ is_head_ref: false })
      .neq("id", "");

    if (clearError) return;

    const { error: setError } = await supabase
      .from("referees")
      .update({ is_head_ref: true })
      .eq("id", refId);

    if (setError) return;

    loadRefs();
  };

  /* 🔥 UPDATED SWITCH */
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

        // 🔥 NEW PAGE
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
    } catch (err) {
      console.error("Referee Manager crash:", err);
      return <div style={{ padding: 20, color: "red" }}>⚠️ Page crashed</div>;
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

          {/* 🔥 NEW TILE */}
          <ManagerTile
            title="Auto Assign Wizard"
            desc="Automatically assign referees"
            active={view === "autoAssign"}
            onClick={() => setView("autoAssign")}
          />

          <ManagerTile
            title="Head Ref"
            desc="Choose the league head referee"
            active={view === "head"}
            onClick={() => setView("head")}
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
