import { useState } from "react";
import { supabase } from "../supabase";

export default function LoginModal({ setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
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
      return;
    }

    // ✅ SUCCESS
    setPage("dashboard");
  };

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Admin Login</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        style={input}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
        style={input}
      />

      <button onClick={login} style={btn}>
        Login
      </button>
    </div>
  );
}

const input = {
  display: "block",
  width: "100%",
  maxWidth: 300,
  margin: "10px auto",
  padding: 10
};

const btn = {
  padding: 10,
  marginTop: 10,
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 6
};
