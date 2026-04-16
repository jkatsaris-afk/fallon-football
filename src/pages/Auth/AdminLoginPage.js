import { useState } from "react";
import { supabase } from "../supabase";
import logo from "../resources/logo.png";

export default function LoginModal({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    // 🔥 CHECK ADMIN ACCESS
    const { data: userData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("auth_id", data.user.id)
      .maybeSingle();

    if (!userData?.is_admin) {
      alert("You do not have admin access");
      setLoading(false);
      return;
    }

    setPage("dashboard");
    setLoading(false);
  };

  return (
    <div style={container}>

      {/* 🔥 FORM WRAPPER (ENABLES ENTER KEY) */}
      <form
        style={card}
        onSubmit={(e) => {
          e.preventDefault();
          login();
        }}
      >

        <img src={logo} alt="logo" style={logoStyle} />

        <h2 style={{ marginBottom: 10 }}>Admin Login</h2>

        <p style={subText}>
          Fallon Football Admin Access
        </p>

        <input
          type="email"
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

        {/* 🔥 SUBMIT BUTTON */}
        <button type="submit" style={btn}>
          {loading ? "Signing In..." : "Login"}
        </button>

      </form>

    </div>
  );
}

/* 🔥 STYLES */

const container = {
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc"
};

const card = {
  width: 340,
  background: "#fff",
  padding: 30,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  textAlign: "center"
};

const logoStyle = {
  width: 60,
  marginBottom: 15
};

const subText = {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 20
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginBottom: 12,
  boxSizing: "border-box"
};

const btn = {
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 10
};
