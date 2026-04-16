import { useNavigate } from "react-router-dom";

export default function RefLoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // 🔥 replace later with real auth
    localStorage.setItem("ref_logged_in", "true");
    navigate("/ref");
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>Referee Login</h2>

      <div className="card">
        <div className="title">Referee Access</div>

        <button className="button" onClick={handleLogin}>
          Login
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
