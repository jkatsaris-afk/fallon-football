import React, { useState } from "react";
import Fields from "./FieldManagerPages/Fields";

export default function FieldManager() {
  const [activeTab, setActiveTab] = useState("fields");

  return (
    <div style={pageWrap}>
      <div style={topSection}>
        <div>
          <h1 style={title}>Field Manager</h1>
          <div style={subtitle}>
            Manage regular season fields, championship fields, divisions, and field time blocks.
          </div>
        </div>

        <div style={tileGrid}>
          <ManagerTile
            title="Overview"
            desc="Field setup summary and next steps"
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
          />
          <ManagerTile
            title="Field Assignments"
            desc="Add fields, set championship fields, and edit time blocks"
            active={activeTab === "fields"}
            onClick={() => setActiveTab("fields")}
          />
        </div>
      </div>

      {activeTab === "overview" && (
        <div style={section}>
          <div style={overviewTitle}>Field Setup Overview</div>
          <div style={overviewText}>
            Field Manager is where schedules get their field choices and saved time blocks. Use Field Assignments to create regular season fields, copy them for championships, and add the field-level times used by schedule creation.
          </div>
          <div style={overviewGrid}>
            <OverviewCard title="Regular Fields" text="Used by regular season auto scheduling." />
            <OverviewCard title="Championship Fields" text="Used by championship schedule creation first." />
            <OverviewCard title="Field Time Blocks" text="Saved on each field and used when assigning games." />
          </div>
        </div>
      )}

      <div style={activeTab === "fields" ? section : hiddenSection}>
        {activeTab === "fields" && <Fields />}
      </div>

    </div>
  );
}

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

function OverviewCard({ title, text }) {
  return (
    <div style={overviewCard}>
      <div style={overviewCardTitle}>{title}</div>
      <div style={overviewCardText}>{text}</div>
    </div>
  );
}

const pageWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 20
};

const topSection = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const title = {
  color: "#0f172a",
  fontSize: 28,
  fontWeight: 900,
  margin: 0,
};

const subtitle = {
  color: "#64748b",
  fontSize: 14,
  fontWeight: 700,
  marginTop: 6,
};

const tileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const section = {
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const hiddenSection = { display: "none" };

const tile = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  cursor: "pointer",
  minHeight: 100,
  padding: 18,
  textAlign: "left",
};

const activeTile = {
  outline: "2px solid #16a34a",
  boxShadow: "0 10px 28px rgba(22,163,74,0.16)",
};

const tileTitle = { color: "#0f172a", fontSize: 16, fontWeight: 900 };
const tileDesc = { color: "#64748b", fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginTop: 8 };

const overviewTitle = { color: "#0f172a", fontSize: 20, fontWeight: 900 };
const overviewText = { color: "#64748b", fontSize: 13, fontWeight: 700, lineHeight: 1.5, marginTop: 8 };
const overviewGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 16 };
const overviewCard = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 };
const overviewCardTitle = { color: "#0f172a", fontSize: 15, fontWeight: 900 };
const overviewCardText = { color: "#64748b", fontSize: 12, fontWeight: 700, lineHeight: 1.4, marginTop: 6 };
