import { useState } from "react";
import { supabase } from "../supabase";
import logo from "../resources/logo.png";

export default function LoginModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError("Invalid login");
      setLoading(false);
      return;
    }

    // ✅ redirect to admin
    window.location.href = "/admin";
  };

  return (
    <div style={page}>

      <div style={card}>

        <img src={logo} alt="logo" style={logoStyle} />

        <h2 style={{ marginBottom: 10 }}>Admin Login</h2>

        <input
          style={input}
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          style={input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        {error && <div style={errorStyle}>{error}</div>}

        <button
          style={button}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>

      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "#f1f5f9"
};

const card = {
  background: "#fff",
  padding: 30,
  borderRadius: 16,
  width: 320,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
};

const logoStyle = {
  width: 80,
  alignSelf: "center",
  marginBottom: 10
};

const input = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 14
};

const button = {
  padding: 12,
  borderRadius: 10,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  fontWeight: "600",
  cursor: "pointer",
  marginTop: 10
};

const errorStyle = {
  color: "#dc2626",
  fontSize: 13
};
