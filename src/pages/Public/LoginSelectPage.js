import logo from "../../resources/logo.png";

export default function LoginSelectPage({ setPage }) {
  return (
    <div style={container}>

      <img src={logo} style={logoStyle} alt="logo" />

      <h2>Select Access</h2>

      <div style={grid}>

        <RoleCard
          title="League Admin"
          onClick={() => setPage("adminLogin")}
        />

        <RoleCard
          title="Coach"
          onClick={() => setPage("coachLogin")}
        />

        <RoleCard
          title="Referee"
          onClick={() => setPage("refLogin")}
        />

        <RoleCard
          title="Parent"
          onClick={() => setPage("parentLogin")}
        />

      </div>
    </div>
  );
}

/* COMPONENT */

function RoleCard({ title, onClick }) {
  return (
    <div onClick={onClick} style={card}>
      {title}
    </div>
  );
}

/* STYLES */

const container = {
  textAlign: "center",
  paddingTop: 30
};

const logoStyle = {
  width: 80,
  marginBottom: 20
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 15,
  padding: 20
};

const card = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
};
