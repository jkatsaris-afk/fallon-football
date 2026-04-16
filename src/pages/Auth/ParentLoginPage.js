import { useNavigate } from "react-router-dom";

export default function ParentLoginPage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.setItem("parent_logged_in", "true");
    navigate("/parent");
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>Parent Login</h2>

      <div className="card">
        <div className="title">Parent Access</div>

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
