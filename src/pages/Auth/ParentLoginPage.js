import { useNavigate } from "react-router-dom";

export default function ParentLoginPage() {
  const navigate = useNavigate();

  const login = () => {
    localStorage.setItem("parent_logged_in", "true");
    navigate("/parent");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Parent Login</h2>

      <div className="card">
        <button className="button" onClick={login}>
          Login
        </button>
      </div>
    </div>
  );
}
