import React from "react";

export default function LoadingScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.logo}>OIKOS</div>

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
    background: "linear-gradient(to bottom right, #0f172a, #1e293b)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
  },
  logo: {
    fontSize: "32px",
    fontWeight: "600",
    marginBottom: "20px",
    letterSpacing: "2px",
  },
  dots: {
    display: "flex",
    gap: "10px",
  },
  dot: {
    width: "12px",
    height: "12px",
    backgroundColor: "#22c55e",
    borderRadius: "50%",
    animation: "bounce 1.4s infinite ease-in-out both",
  },
};
