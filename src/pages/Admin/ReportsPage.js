import React from "react";

export default function ReportsPage() {
  return (
    <div style={container}>

      <div style={card}>

        <div style={icon}>📊</div>

        <h1 style={title}>Reports</h1>

        <p style={subtitle}>
          Reporting tools are currently being built.
        </p>

        <div style={features}>
          <div>• Player registration reports</div>
          <div>• Team roster exports</div>
          <div>• Shirt size breakdowns</div>
          <div>• Parent contact lists</div>
          <div>• Game & schedule reports</div>
        </div>

        <div style={comingSoon}>
          Coming Soon 🚧
        </div>

      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const container = {
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const card = {
  background: "rgba(255,255,255,0.4)",
  backdropFilter: "blur(12px)",
  borderRadius: 16,
  padding: 40,
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  maxWidth: 420
};

const icon = {
  fontSize: 50,
  marginBottom: 10
};

const title = {
  marginBottom: 10
};

const subtitle = {
  color: "#64748b",
  marginBottom: 20
};

const features = {
  textAlign: "left",
  marginBottom: 20,
  color: "#334155"
};

const comingSoon = {
  marginTop: 10,
  fontWeight: "600",
  color: "#2f6ea6"
};
