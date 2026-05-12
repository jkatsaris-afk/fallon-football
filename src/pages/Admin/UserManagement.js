import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    is_admin: false,
    is_coach: false,
    is_parent: false,
    is_referee: false,
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("users").select("*");
    setUsers(data || []);
  };

  const addUser = async () => {
    setStatus("");

    if (!newUser.email.trim()) {
      setStatus("Email is required.");
      return;
    }

    const { error } = await supabase.from("users").insert({
      ...newUser,
      email: newUser.email.trim(),
      first_name: newUser.first_name.trim() || null,
      last_name: newUser.last_name.trim() || null,
      phone: newUser.phone.trim() || null,
    });

    if (error) {
      console.error("User add error:", error);
      setStatus(`Could not add user: ${error.message}`);
      return;
    }

    setStatus("User added. Use password reset to invite them to set a password.");
    setNewUser({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      is_admin: false,
      is_coach: false,
      is_parent: false,
      is_referee: false,
    });
    loadUsers();
  };

  const filtered = users.filter(u =>
    `${u.first_name || ""} ${u.last_name || ""} ${u.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const updateUser = async (field, value) => {
    await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", selectedUser.id);

    setSelectedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEmail = async (email) => {
    await supabase.auth.updateUser({ email });
    await updateUser("email", email);
  };

  const toggleRole = async (field, value) => {
    await updateUser(field, value);
  };

  const resetPassword = async () => {
    await supabase.auth.resetPasswordForEmail(selectedUser.email);
    alert("Password reset sent");
  };

  const uploadAvatar = async (file) => {
    if (!file) return;

    const path = `${selectedUser.id}-${Date.now()}`;

    await supabase.storage.from("avatars").upload(path, file);

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    await updateUser("avatar_url", data.publicUrl);
  };

  /* ================= PROFILE VIEW ================= */
  if (selectedUser) {
    return (
      <div style={page}>

        {/* HEADER */}
        <div style={header}>
          <button onClick={() => setSelectedUser(null)} style={backBtn}>
            ←
          </button>
        </div>

        {/* PROFILE CARD */}
        <div style={profileCard}>

          <img
            src={selectedUser.avatar_url || "/default-avatar.png"}
            style={avatar}
            alt=""
          />

          <h2 style={{ marginTop: 10 }}>
            {selectedUser.first_name} {selectedUser.last_name}
          </h2>

          <div style={email}>
            {selectedUser.email}
          </div>

          <input
            type="file"
            onChange={(e) => uploadAvatar(e.target.files[0])}
            style={{ marginTop: 10 }}
          />

        </div>

        {/* CONTACT */}
        <div style={card}>
          <Row label="Email">
            <input
              value={selectedUser.email || ""}
              onChange={(e) => updateEmail(e.target.value)}
              style={inputInline}
            />
          </Row>

          <Row label="Phone">
            <input
              value={selectedUser.phone || ""}
              onChange={(e) => updateUser("phone", e.target.value)}
              style={inputInline}
            />
          </Row>
        </div>

        {/* ROLES */}
        <div style={card}>
          <SectionTitle title="Access" />

          <RoleToggle label="Admin" value={selectedUser.is_admin} onChange={(v)=>toggleRole("is_admin",v)} />
          <RoleToggle label="Coach" value={selectedUser.is_coach} onChange={(v)=>toggleRole("is_coach",v)} />
          <RoleToggle label="Parent" value={selectedUser.is_parent} onChange={(v)=>toggleRole("is_parent",v)} />
          <RoleToggle label="Referee" value={selectedUser.is_referee} onChange={(v)=>toggleRole("is_referee",v)} />
        </div>

        {/* ACTION */}
        <div style={card}>
          <button style={resetBtn} onClick={resetPassword}>
            Send Password Reset
          </button>
        </div>

      </div>
    );
  }

  /* ================= LIST VIEW ================= */
  return (
    <div style={listPage}>
      <div>
        <h2 style={title}>User Management</h2>
        <div style={sub}>Add users, edit contact details, and manage portal roles.</div>
      </div>

      {status && <div style={statusBox}>{status}</div>}

      <div style={card}>
        <SectionTitle title="Add User" />
        <div style={formGrid}>
          <input
            placeholder="First name"
            value={newUser.first_name}
            onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
            style={searchBox}
          />
          <input
            placeholder="Last name"
            value={newUser.last_name}
            onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
            style={searchBox}
          />
          <input
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            style={searchBox}
          />
          <input
            placeholder="Phone"
            value={newUser.phone}
            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
            style={searchBox}
          />
        </div>
        <div style={roleGrid}>
          <RoleToggle label="Admin" value={newUser.is_admin} onChange={(v) => setNewUser({ ...newUser, is_admin: v })} />
          <RoleToggle label="Coach" value={newUser.is_coach} onChange={(v) => setNewUser({ ...newUser, is_coach: v })} />
          <RoleToggle label="Parent" value={newUser.is_parent} onChange={(v) => setNewUser({ ...newUser, is_parent: v })} />
          <RoleToggle label="Referee" value={newUser.is_referee} onChange={(v) => setNewUser({ ...newUser, is_referee: v })} />
        </div>
        <button style={addBtn} onClick={addUser}>Add User</button>
      </div>

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
            <div style={sub}>{user.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Row({ label, children }) {
  return (
    <div style={row}>
      <span>{label}</span>
      {children}
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div style={sectionTitle}>
      {title}
    </div>
  );
}

function RoleToggle({ label, value, onChange }) {
  return (
    <div style={row}>
      <span>{label}</span>

      <div
        onClick={() => onChange(!value)}
        style={{
          width: 50,
          height: 26,
          borderRadius: 20,
          background: value ? "#7c3aed" : "#e5e7eb",
          position: "relative",
          cursor: "pointer"
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 2,
            left: value ? 26 : 2
          }}
        />
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const page = {
  padding: 20,
  background: "#f3f4f6",
  minHeight: "100vh"
};

const listPage = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const title = {
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 900,
  margin: 0,
};

const statusBox = {
  background: "#ecfdf3",
  borderRadius: 10,
  color: "#166534",
  fontSize: 13,
  fontWeight: 800,
  padding: "10px 12px",
};

const formGrid = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
};

const roleGrid = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  marginTop: 12,
};

const addBtn = {
  background: "#16a34a",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  marginTop: 12,
  padding: "10px 14px",
};

const header = {
  marginBottom: 10
};

const backBtn = {
  background: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

const profileCard = {
  background: "#fff",
  borderRadius: 20,
  padding: 20,
  textAlign: "center",
  marginBottom: 15,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};

const avatar = {
  width: 90,
  height: 90,
  borderRadius: "50%",
  objectFit: "cover"
};

const email = {
  fontSize: 13,
  color: "#6b7280"
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 15,
  marginBottom: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,0.05)"
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9"
};

const inputInline = {
  border: "none",
  borderBottom: "1px solid #ddd",
  outline: "none",
  textAlign: "right"
};

const sectionTitle = {
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 8
};

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

const sub = {
  fontSize: 12,
  color: "#64748b"
};

const resetBtn = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  background: "#7c3aed",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  cursor: "pointer"
};
