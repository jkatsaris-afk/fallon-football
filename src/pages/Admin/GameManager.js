import React, { useState } from "react";
import ScoreManagementPage from "./GameManagerPages/ScoreManagementPage";
import ScoreRecordsPage from "./GameManagerPages/ScoreRecordsPage";
import LiveScoreboardPage from "./GameManagerPages/LiveScoreboardPage";

export default function GameManager() {
  const [tab, setTab] = useState("score");

  return (
    <div style={wrap}>

      <div style={statsGrid}>
        <StatTile label="Score Management" active={tab==="score"} onClick={()=>setTab("score")} />
        <StatTile label="Score Records" active={tab==="records"} onClick={()=>setTab("records")} />
        <StatTile label="Live Scoreboard" active={tab==="live"} onClick={()=>setTab("live")} />
      </div>

      <div style={section}>
        {tab === "score" && <ScoreManagementPage />}
        {tab === "records" && <ScoreRecordsPage />}
        {tab === "live" && <LiveScoreboardPage />}
      </div>

    </div>
  );
}

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

const wrap = { display:"flex", flexDirection:"column", gap:20 };
const statsGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:14 };
const section = { background:"#fff", borderRadius:18, padding:20, boxShadow:"0 8px 24px rgba(0,0,0,0.08)" };
