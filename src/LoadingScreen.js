import React from "react";
import "./styles.css"; // make sure this is already imported in your app

export default function LoadingScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.title}>FALLON FOOTBALL</div>

      <div style={styles.dots}>
        <span style={{ ...styles.dot, animationDelay: "0s" }} />
        <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
        <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    width: "100%",
    background: "#ffffff", // 🔥 match index.html
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
    animation: "bounce 1.4s infinite ease-in-out",
  },
};
