import { useState } from "react";
import { supabase } from "../../supabase";
import logo from "../../resources/logo.png";

export default function RefLoginPage({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setLoading(false);
      alert("Login failed");
      return;
    }

    // 🔥 SUCCESS → GO TO DASHBOARD
    setPage("refDashboard");
  };

  const resetPassword = async () => {
    if (!email) {
      alert("Enter your email first");
      return;
    }

    await supabase.auth.resetPasswordForEmail(email);
    alert("Password reset email sent");
  };

  return (
    <div style={container}>

      <img src={logo} style={logoStyle} alt="logo" />

      <h2>Referee Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={input}
      />

      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={input}
      />

      <button
        onClick={login}
        style={btn}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Login"}
      </button>

      <div style={links}>
        <span onClick={resetPassword}>Forgot Password?</span>
        <span onClick={() => setPage("loginSelect")}>Back</span>
      </div>

    </div>
  );
}

/* 🔥 STYLES */

const container = {
  textAlign: "center",
  paddingTop: 40,
  maxWidth: 400,
  margin: "0 auto"
};

const logoStyle = {
  width: 80,
  marginBottom: 20
};

const input = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  outline: "none"
};

const btn = {
  width: "100%",
  padding: 12,
  marginTop: 15,
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer"
};

const links = {
  marginTop: 15,
  display: "flex",
  justifyContent: "space-between",
  fontSize: 13,
  color: "#6b7280",
  cursor: "pointer"
};
