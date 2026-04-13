import { useState } from "react";
import { supabase } from "../../supabase";

export default function RefLogin({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("Login failed");
      return;
    }

    setPage("refDashboard");
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
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={input}
      />

      <button onClick={login} style={btn}>
        Login
      </button>
    </div>
  );
}

const container = {
  padding: 20,
  textAlign: "center"
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10
};

const btn = {
  marginTop: 15,
  padding: 12,
  width: "100%",
  background: "#16a34a",
  color: "#fff",
  border: "none"
};
