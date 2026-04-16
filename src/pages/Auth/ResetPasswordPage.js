import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import logo from "../../resources/logo.png";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // 🔥 CHECK IF USER ARRIVED WITH VALID RESET SESSION
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        alert("Invalid or expired reset link");
        window.location.href = "/";
        return;
      }

      setReady(true);
    };

    checkSession();
  }, []);

  const updatePassword = async () => {
    if (!password || !confirm) {
      alert("Enter password");
      return;
    }

    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Password updated!");

    // 🔥 SEND USER BACK TO LOGIN
    window.location.href = "/";
  };

  if (!ready) return null;

  return (
    <div style={container}>
      <div style={card}>

        <img src={logo} alt="logo" style={logoStyle} />

        <h2 style={{ marginBottom: 10 }}>Reset Password</h2>

        <p style={subText}>
          Enter your new password
        </p>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={input}
        />

        <button onClick={updatePassword} style={btn}>
          {loading ? "Updating..." : "Update Password"}
        </button>

      </div>
    </div>
  );
}

/* STYLES */

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
