import { useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    // 🔥 TEMP (replace later with Supabase auth)
    localStorage.setItem("admin_logged_in", "true");

    navigate("/admin");
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>League Login</h2>

      <div className="card">
        <div className="title">League Admin Access</div>

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
