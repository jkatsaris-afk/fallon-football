import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("users").select("*");
    setUsers(data || []);
  };

  const filtered = users.filter(u =>
    `${u.first_name || ""} ${u.last_name || ""} ${u.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // 🔥 UPDATE FIELD
  const updateField = async (field, value) => {
    await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", selectedUser.id);

    setSelectedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 🔥 TOGGLE ROLE
  const toggleRole = async (field, value) => {
    await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", selectedUser.id);

    setSelectedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetPassword = async () => {
    await supabase.auth.resetPasswordForEmail(selectedUser.email);
    alert("Reset email sent");
  };

  // 🔥 DETAIL VIEW
  if (selectedUser) {
    return (
      <div>
        <button onClick={() => setSelectedUser(null)}>← Back</button>

        <h2>
          {selectedUser.first_name} {selectedUser.last_name}
        </h2>

        <Input
          label="First Name"
          value={selectedUser.first_name || ""}
          onChange={(v) => updateField("first_name", v)}
        />

        <Input
          label="Last Name"
          value={selectedUser.last_name || ""}
          onChange={(v) => updateField("last_name", v)}
        />

        <Input
          label="Username"
          value={selectedUser.username || ""}
          onChange={(v) => updateField("username", v)}
        />

        <div style={email}>
          {selectedUser.email}
        </div>

        <h4 style={{ marginTop: 20 }}>Roles</h4>

        <RoleCheck
          label="Admin"
          value={selectedUser.is_admin}
          onChange={(v) => toggleRole("is_admin", v)}
        />

        <RoleCheck
          label="Coach"
          value={selectedUser.is_coach}
          onChange={(v) => toggleRole("is_coach", v)}
        />

        <RoleCheck
          label="Parent"
          value={selectedUser.is_parent}
          onChange={(v) => toggleRole("is_parent", v)}
        />

        <RoleCheck
          label="Referee"
          value={selectedUser.is_referee}
          onChange={(v) => toggleRole("is_referee", v)}
        />

        <button style={resetBtn} onClick={resetPassword}>
          Send Password Reset
        </button>
      </div>
    );
  }

  // 🔥 LIST VIEW
  return (
    <div>
      <h2>User Management</h2>

      <input
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchBox}
      />

      <div style={{ marginTop: 15 }}>
        {filtered.map(user => (
          <div
            key={user.id}
            style={userRow}
            onClick={() => setSelectedUser(user)}
          >
            <div style={{ fontWeight: 600 }}>
              {user.first_name} {user.last_name}
            </div>

            <div style={{ fontSize: 12, color: "#64748b" }}>
              {user.email}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* COMPONENTS */

function Input({ label, value, onChange }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={labelStyle}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
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

const searchBox = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd"
};

const userRow = {
  background: "#fff",
  padding: 12,
  borderRadius: 10,
  marginBottom: 8,
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
};

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ddd"
};

const labelStyle = {
  fontSize: 12,
  color: "#64748b"
};

const email = {
  marginTop: 10,
  fontSize: 13,
  color: "#64748b"
};

const checkRow = {
  display: "block",
  marginTop: 6
};

const resetBtn = {
  marginTop: 20,
  padding: 12,
  borderRadius: 10,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};
