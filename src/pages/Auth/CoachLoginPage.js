import { useNavigate } from "react-router-dom";

export default function CoachLoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.setItem("coach_logged_in", "true");
    navigate("/coach");
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>Coach Login</h2>

      <div className="card">
        <div className="title">Coach Access</div>

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
