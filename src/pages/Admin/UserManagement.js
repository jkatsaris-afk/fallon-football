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

  return (
    <div>
      <h2>User Management</h2>

      {users.map(user => (
        <div key={user.id} style={card}>

          <div style={{ fontWeight: 600 }}>{user.email}</div>

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
      ))}
    </div>
  );
}

/* COMPONENT */

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
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
};

const checkRow = {
  display: "block",
  marginTop: 5
};
