import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

import CoachStaffPage from "./CoachManagerPages/CoachStaffPage";

export default function CoachManager() {
  const [coaches, setCoaches] = useState([]);
  const [view, setView] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Error loading coaches:", error);
      setCoaches([]);
      setLoading(false);
      return;
    }

    setCoaches(data || []);
    setLoading(false);
  };

  /* 🔥 MATCH REF STRUCTURE */

  const getName = (c) =>
    `${c.first_name || ""} ${c.last_name || ""}`.trim();

  const getStatus = (c) => c.status || "pending";

  const getRole = (c) => {
    if (!c.role) return "assistant";
    return c.role.toLowerCase().includes("head") ? "head" : "assistant";
  };

  const displayRole = (c) => {
    if (!c.role) return "Assistant Coach";
    return c.role.toLowerCase().includes("head")
      ? "Head Coach"
      : "Assistant Coach";
  };

  const updateStatus = async (id, status) => {
    await supabase.from("coaches").update({ status }).eq("id", id);
    loadCoaches();
  };

  const updateRole = async (coach, newRole) => {
    await supabase
      .from("coaches")
      .update({
        role: newRole === "head" ? "Head Coach" : "Assistant Coach",
      })
      .eq("id", coach.id);

    loadCoaches();
  };

  const renderSelectedPage = () => {
    try {
      switch (view) {
        case "staff":
          return (
            <CoachStaffPage
              coaches={coaches}
              loading={loading}
              getName={getName}
              getStatus={getStatus}
              getRole={getRole}
              displayRole={displayRole}
              updateStatus={updateStatus}
              updateRole={updateRole}
            />
          );

        default:
          return (
            <div style={contentWrap}>
              <div style={emptyStateCard}>
                <div style={emptyTitle}>Coach Manager</div>
                <div style={emptyText}>
                  Pick a tile above to manage coach staff.
                </div>
              </div>
            </div>
          );
      }
    } catch (err) {
      console.error("Coach Manager crash:", err);
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
            <h1 style={title}>Coach Manager</h1>
            <div style={subtitle}>
              Manage coach staff, approvals, and roles.
            </div>
          </div>
        </div>

        <div style={tileGrid}>
          <ManagerTile
            title="Coach Staff"
            desc="View, approve, and assign roles"
            active={view === "staff"}
            onClick={() => setView("staff")}
          />
        </div>
      </div>

      {renderSelectedPage()}
    </div>
  );
}

/* 🔥 SAME UI AS REF */

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
};

const emptyText = {
  marginTop: 8,
  color: "#64748b",
};
