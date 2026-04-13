import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function UserManagement() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("users").select("*");
    setUsers(data || []);
  };

  const toggleRole = async (id, field, value) => {
    await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", id);

    loadUsers();
  };

  const updateField = async (id, field, value) => {
    await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", id);

    loadUsers();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      alert("Error sending reset email");
    } else {
      alert("Password reset email sent!");
    }
  };

  return (
    <div>
      <h2>User Management</h2>

      {users.map(user => (
        <div key={user.id} style={card}>

          {/* NAME ROW */}
          <div style={row}>
            <Input
              placeholder="First Name"
              value={user.first_name || ""}
              onChange={(val) => updateField(user.id, "first_name", val)}
            />

            <Input
              placeholder="Last Name"
              value={user.last_name || ""}
              onChange={(val) => updateField(user.id, "last_name", val)}
            />
          </div>

          {/* USERNAME */}
          <Input
            placeholder="Username"
            value={user.username || ""}
            onChange={(val) => updateField(user.id, "username", val)}
          />

          {/* EMAIL */}
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 5 }}>
            {user.email}
          </div>

          {/* ROLES */}
          <div style={{ marginTop: 10 }}>
            <RoleCheck
              label="Admin"
              value={user.is_admin}
              onChange={(v) => toggleRole(user.id, "is_admin", v)}
            />

            <RoleCheck
              label="Coach"
              value={user.is_coach}
              onChange={(v) => toggleRole(user.id, "is_coach", v)}
            />

            <RoleCheck
              label="Parent"
              value={user.is_parent}
              onChange={(v) => toggleRole(user.id, "is_parent", v)}
            />

            <RoleCheck
              label="Referee"
              value={user.is_referee}
              onChange={(v) => toggleRole(user.id, "is_referee", v)}
            />
          </div>

          {/* PASSWORD RESET */}
          <button
            style={resetBtn}
            onClick={() => resetPassword(user.email)}
          >
            Send Password Reset
          </button>

        </div>
      ))}
    </div>
  );
}

/* COMPONENTS */

function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={input}
    />
  );
}

function RoleCheck({ label, value, onChange }) {
  return (
    <label style={checkRow}>
      <input
        type="checkbox"
        checked={value || false}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

/* STYLES */

const card = {
  background: "#fff",
  padding: 15,
  borderRadius: 12,
  marginBottom: 12,
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
};

const row = {
  display: "flex",
  gap: 10
};

const input = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ddd",
  marginTop: 5
};

const checkRow = {
  display: "block",
  marginTop: 5
};

const resetBtn = {
  marginTop: 10,
  padding: 10,
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};
