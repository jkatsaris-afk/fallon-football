import { useNavigate } from "react-router-dom";

export default function RefLoginPage() {
  const navigate = useNavigate();

  const login = () => {
    localStorage.setItem("ref_logged_in", "true");
    navigate("/ref");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Referee Login</h2>

      <div className="card">
        <button className="button" onClick={login}>
          Login
        </button>
      </div>
    </div>
  );
}
