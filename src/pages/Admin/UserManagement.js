import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabase";
import defaultAvatar from "../../resources/Default-A.png";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("users").select("*");
    setUsers(data || []);
  };

  const filtered = users.filter(u =>
    `${u?.first_name || ""} ${u?.last_name || ""} ${u?.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const updateUser = async (field, value) => {
    if (!selectedUser?.id) return;

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
    if (!email) return;
    await supabase.auth.updateUser({ email });
    await updateUser("email", email);
  };

  const toggleRole = async (field, value) => {
    await updateUser(field, value);
  };

  const resetPassword = async () => {
    if (!selectedUser?.email) return;
    await supabase.auth.resetPasswordForEmail(selectedUser.email);
    alert("Password reset sent");
  };

  const uploadAvatar = async (file) => {
    if (!file || !selectedUser?.id) return;

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

        {/* PROFILE */}
        <div style={profile}>

          <div
            style={avatarWrap}
            onClick={() => fileRef.current?.click()}
          >
            <img
              src={selectedUser.avatar_url || defaultAvatar}
              style={avatar}
              alt=""
            />
            <div style={overlay}>Change</div>
          </div>

          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => uploadAvatar(e.target.files?.[0])}
          />

          <h2>
            {(selectedUser.first_name || "") + " " + (selectedUser.last_name || "")}
          </h2>

          {/* EMAIL */}
          <Field
            label="Email"
            value={String(selectedUser.email || "")}
            onChange={updateEmail}
          />

          {/* PHONE */}
          <Field
            label="Phone"
            value={String(selectedUser.phone || "")}
            onChange={(v) => updateUser("phone", v)}
          />

          {/* ROLES */}
          <div style={section}>
            <SectionTitle title="Access" />

            <RoleToggle label="Admin" value={!!selectedUser.is_admin} onChange={(v)=>toggleRole("is_admin",v)} />
            <RoleToggle label="Coach" value={!!selectedUser.is_coach} onChange={(v)=>toggleRole("is_coach",v)} />
            <RoleToggle label="Parent" value={!!selectedUser.is_parent} onChange={(v)=>toggleRole("is_parent",v)} />
            <RoleToggle label="Referee" value={!!selectedUser.is_referee} onChange={(v)=>toggleRole("is_referee",v)} />
          </div>

          <button style={resetBtn} onClick={resetPassword}>
            Send Password Reset
          </button>

        </div>
      </div>
    );
  }

  /* ================= LIST VIEW ================= */
  return (
    <div style={{ padding: 10 }}>
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
              {(user.first_name || "") + " " + (user.last_name || "")}
            </div>
            <div style={sub}>{user.email || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* COMPONENTS */

function Field({ label, value, onChange }) {
  return (
    <div style={field}>
      <div style={label}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

function SectionTitle({ title }) {
  return <div style={sectionTitle}>{title}</div>;
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
          background: value ? "#16a34a" : "#e5e7eb",
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

/* STYLES */

const page = { padding: 20, background: "#fff" };
const header = { marginBottom: 10 };
const backBtn = { background: "#eee", border: "none", padding: 8, borderRadius: 8 };

const profile = { textAlign: "center" };

const avatarWrap = { position: "relative", display: "inline-block", cursor: "pointer" };
const avatar = { width: 90, height: 90, borderRadius: "50%" };
const overlay = { position: "absolute", bottom: 0, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 12, width: "100%" };

const field = { marginTop: 15, textAlign: "left" };
const label = { fontSize: 12, color: "#666" };
const input = { width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" };

const section = { marginTop: 20 };
const sectionTitle = { fontSize: 12, color: "#999" };

const row = { display: "flex", justifyContent: "space-between", marginTop: 10 };

const resetBtn = { marginTop: 20, width: "100%", padding: 12, borderRadius: 10, background: "#16a34a", color: "#fff", border: "none" };

const searchBox = { width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" };
const userRow = { padding: 12, borderBottom: "1px solid #eee", cursor: "pointer" };
const sub = { fontSize: 12, color: "#777" };
