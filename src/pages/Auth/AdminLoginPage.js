import { useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 20 }}>

      <h2>Login</h2>

      <div className="card">
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
