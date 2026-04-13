import { useState } from "react";
import { supabase } from "../../supabase";

export default function RefLoginPage({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // 🔥 TODO later: check role from DB
    setPage("home");

    setLoading(false);
  };

  return (
    <div style={container}>

      <h2>Referee Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={input}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={input}
      />

      {error && <div style={errorText}>{error}</div>}

      <button onClick={handleLogin} style={button}>
        {loading ? "Signing in..." : "Login"}
      </button>

      <div
        style={link}
        onClick={() => setPage("signupSelect")}
      >
        Need an account? Sign Up
      </div>

    </div>
  );
}

/* STYLES */

const container = {
  padding: 20,
  textAlign: "center"
};

const input = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #ddd"
};

const button = {
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

const errorText = {
  color: "red",
  marginTop: 10
};

const link = {
  marginTop: 15,
  color: "#2563eb",
  cursor: "pointer"
};
