import { useNavigate } from "react-router-dom";

export default function CoachLoginPage() {
  const navigate = useNavigate();

  const login = () => {
    localStorage.setItem("coach_logged_in", "true");
    navigate("/coach");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Coach Login</h2>

      <div className="card">
        <button className="button" onClick={login}>
          Login
        </button>
      </div>
    </div>
  );
}
