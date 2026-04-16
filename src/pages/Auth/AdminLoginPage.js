import { useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  return (
    <div style={wrap}>

      <div style={card}>
        <h2 style={title}>Login</h2>

        <div className="title">League Admin Access</div>

        <button
          className="button"
          onClick={() => navigate("/admin")}
        >
          Login as Admin
        </button>

        <button
          style={{ marginTop: 10 }}
          onClick={() => navigate("/")}
        >
          Cancel
        </button>
      </div>

    </div>
  );
}

/* SAME STYLES */
const wrap = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 20
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 24,
  width: "100%",
  maxWidth: 400,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  textAlign: "center"
};

const title = {
  marginBottom: 12
};
