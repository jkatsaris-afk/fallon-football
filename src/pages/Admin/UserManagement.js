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
    setUsers(Array.isArray(data) ? data : []);
  };

  const filtered = users.filter((u) => {
    const name = `${u?.first_name || ""} ${u?.last_name || ""} ${u?.email || ""}`;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const updateUser = async (field, value) => {
    if (!selectedUser?.id) return;

    await supabase
      .from("users")
      .update({ [field]: value })
      .eq("id", selectedUser.id);

    setSelectedUser((prev) => ({
      ...prev,
      [field]: value,
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

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file);

    if (error) {
      alert("Upload failed");
      return;
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    await updateUser("avatar_url", data.publicUrl);
  };

  /* ================= PROFILE VIEW ================= */
  if (selectedUser && typeof selectedUser === "object") {
    const safe = {
      first_name: String(selectedUser.first_name || ""),
      last_name: String(selectedUser.last_name || ""),
      email: String(selectedUser.email || ""),
      phone: String(selectedUser.phone || ""),
      avatar_url: selectedUser.avatar_url || "",
      is_admin: !!selectedUser.is_admin,
      is_coach: !!selectedUser.is_coach,
      is_parent: !!selectedUser.is_parent,
      is_referee: !!selectedUser.is_referee,
    };

    return (
      <div style={page}>
        <button onClick={() => setSelectedUser(null)}>Back</button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <img
            src={safe.avatar_url || defaultAvatar}
            style={avatar}
            alt=""
          />

          <input
            ref={fileRef}
            type="file"
            hidden
            onChange={(e) => uploadAvatar(e.target.files?.[0])}
          />

          <h2>{safe.first_name} {safe.last_name}</h2>

          <input
            value={safe.email}
            onChange={(e) => updateEmail(e.target.value)}
          />

          <input
            value={safe.phone}
            onChange={(e) => updateUser("phone", e.target.value)}
          />

          <div style={{ marginTop: 20 }}>
            <RoleToggle label="Admin" value={safe.is_admin} onChange={(v)=>toggleRole("is_admin",v)} />
            <RoleToggle label="Coach" value={safe.is_coach} onChange={(v)=>toggleRole("is_coach",v)} />
            <RoleToggle label="Parent" value={safe.is_parent} onChange={(v)=>toggleRole("is_parent",v)} />
            <RoleToggle label="Referee" value={safe.is_referee} onChange={(v)=>toggleRole("is_referee",v)} />
          </div>

          <button onClick={resetPassword}>Reset Password</button>
        </div>
      </div>
    );
  }

  /* ================= LIST VIEW ================= */
  return (
    <div>
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.map((user) => (
        <div
          key={user.id}
          onClick={() => setSelectedUser(user)}
        >
          {String(user?.first_name || "")} {String(user?.last_name || "")}
        </div>
      ))}
    </div>
  );
}

/* SAFE TOGGLE */
function RoleToggle({ label, value, onChange }) {
  return (
    <div onClick={() => onChange(!value)}>
      {label}: {value ? "ON" : "OFF"}
    </div>
  );
}

const page = { padding: 20 };
const avatar = { width: 80, height: 80, borderRadius: "50%" };
