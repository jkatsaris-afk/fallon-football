import React, { useState } from "react";
import ScoreManagementPage from "./GameManagerPages/ScoreManagementPage";
import ScoreRecordsPage from "./GameManagerPages/ScoreRecordsPage";
import LiveScoreboardPage from "./GameManagerPages/LiveScoreboardPage";

export default function GameManager() {
  const [view, setView] = useState("dashboard");

  const renderSelectedPage = () => {
    try {
      switch (view) {
        case "score":
          return <ScoreManagementPage />;

        case "records":
          return <ScoreRecordsPage />;

        case "live":
          return <LiveScoreboardPage />;

        default:
          return (
            <div style={contentWrap}>
              <div style={emptyStateCard}>
                <div style={emptyTitle}>Game Manager</div>
                <div style={emptyText}>
                  Select a tile above to manage scores and live games.
                </div>
              </div>
            </div>
          );
      }
    } catch (err) {
      console.error("Game Manager crash:", err);
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
            <h1 style={title}>Game Manager</h1>
            <div style={subtitle}>
              Manage scoring, live games, and historical records.
            </div>
          </div>
        </div>

        <div style={tileGrid}>
          <ManagerTile
            title="Score Management"
            desc="Start and manage game scoring"
            active={view === "score"}
            onClick={() => setView("score")}
          />

          <ManagerTile
            title="Score Records"
            desc="View completed game results"
            active={view === "records"}
            onClick={() => setView("records")}
          />

          <ManagerTile
            title="Live Scoreboard"
            desc="Control live game scoring"
            active={view === "live"}
            onClick={() => setView("live")}
          />
        </div>

      </div>

      {renderSelectedPage()}
    </div>
  );
}

/* 🔥 MATCHED TILE COMPONENT */
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

/* 🔥 STYLES (COPIED 1:1 STYLE SYSTEM) */

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
