import React, { useState } from "react";
import Fields from "./FieldManagerPages/Fields";

export default function FieldManager() {
  const [activeTab, setActiveTab] = useState("fields");

  return (
    <div style={wrap}>

      {/* 🔥 MATCH REF MANAGER TOP TILES */}
      <div style={statsGrid}>
        <StatTile
          label="Fields"
          active={activeTab === "fields"}
          onClick={() => setActiveTab("fields")}
        />
      </div>

      {/* 🔥 CONTENT */}
      <div style={section}>
        {activeTab === "fields" && <Fields />}
      </div>

    </div>
  );
}

/* 🔥 TILE */
function StatTile({ label, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        cursor: "pointer",
        outline: active ? "2px solid #16a34a" : "none",
        textAlign: "center",
        fontWeight: 600
      }}
    >
      {label}
    </div>
  );
}

/* 🔥 STYLES (MATCH YOUR SYSTEM) */
const wrap = {
  display: "flex",
  flexDirection: "column",
  gap: 20
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))",
  gap: 14
};

const section = {
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};
