import React from "react";

export default function ViewToggle({ adminView, setAdminView }) {
  const options = ["phone", "ipad", "desktop"];

  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 6,
          borderRadius: 20,
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {options.map((view) => {
          const active = adminView === view;

          return (
            <div
              key={view}
              onClick={() => setAdminView(view)}
              style={{
                padding: "8px 18px",
                borderRadius: 16,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.2s ease",
                background: active
                  ? "rgba(255,255,255,0.9)"
                  : "transparent",
                color: active ? "#000" : "#fff",
              }}
            >
              {view.toUpperCase()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
