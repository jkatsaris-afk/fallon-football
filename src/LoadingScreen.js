import React from "react";

export default function LoadingScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.title}>FALLON FOOTBALL</div>

      <div style={styles.dots}>
        <span style={{ ...styles.dot, animationDelay: "0s" }} />
        <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
        <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    width: "100%",
    background: "#ffffff", // 🔥 FIXED (was dark)
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "#111",
    fontFamily: "sans-serif",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    marginBottom: "20px",
  },
  dots: {
    display: "flex",
    gap: "10px",
  },
  dot: {
    width: "12px",
    height: "12px",
    backgroundColor: "#16a34a", // 🔥 green
    borderRadius: "50%",
    animation: "bounce 1.4s infinite ease-in-out both",
  },
};
