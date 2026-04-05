export default function SignUpSelectPage({ setPage }) {
  return (
    <div style={container}>

      <h1>Sign Up</h1>
      <p style={{ color: "#64748b" }}>
        Choose how you want to register
      </p>

      <div style={grid}>

        <button style={card} onClick={() => setPage("signup")}>
          Player Sign Up
        </button>

        <button style={card} onClick={() => setPage("coachSignup")}>
          Coach Sign Up
        </button>

        <button style={card} onClick={() => setPage("refSignup")}>
          Referee Sign Up
        </button>

      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const container = {
  padding: 20,
  textAlign: "center"
};

const grid = {
  display: "grid",
  gap: 15,
  marginTop: 25,
  maxWidth: 400,
  marginLeft: "auto",
  marginRight: "auto"
};

const card = {
  padding: 20,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 600
};
