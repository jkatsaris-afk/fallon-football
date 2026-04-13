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
    // 🔥 update auth
    await supabase.auth.updateUser({ email });

    // 🔥 update table
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

  /* 🔥 PROFILE VIEW */
  if (selectedUser) {
    return (
      <div>

        {/* HEADER */}
        <div style={topBar}>
          <button onClick={() => setSelectedUser(null)} style={backBtn}>
            ← Back
          </button>
          <div style={title}>User Profile</div>
        </div>

        <div style={profile}>

          {/* AVATAR */}
          <img
            src={selectedUser.avatar_url || "/default-avatar.png"}
            style={avatar}
            alt=""
          />

          <input
            type="file"
            onChange={(e) => uploadAvatar(e.target.files[0])}
          />

          <h2>
            {selectedUser.first_name} {selectedUser.last_name}
          </h2>

          {/* EMAIL */}
          <Field
            label="Email (Username)"
            value={selectedUser.email || ""}
            onChange={updateEmail}
          />

          {/* PHONE */}
          <Field
            label="Phone"
            value={selectedUser.phone || ""}
            onChange={(v) => updateUser("phone", v)}
          />

          {/* ROLES */}
          <div style={{ marginTop: 20 }}>
            <h4>Access</h4>

            <RoleToggle label="Admin" value={selectedUser.is_admin} onChange={(v)=>toggleRole("is_admin",v)} />
            <RoleToggle label="Coach" value={selectedUser.is_coach} onChange={(v)=>toggleRole("is_coach",v)} />
            <RoleToggle label="Parent" value={selectedUser.is_parent} onChange={(v)=>toggleRole("is_parent",v)} />
            <RoleToggle label="Referee" value={selectedUser.is_referee} onChange={(v)=>toggleRole("is_referee",v)} />
          </div>

          <button style={resetBtn} onClick={resetPassword}>
            Send Password Reset
          </button>

        </div>
      </div>
    );
  }

  /* 🔥 LIST VIEW */
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
            <div style={sub}>{user.email}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 🔥 COMPONENTS */

function Field({ label, value, onChange }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={labelStyle}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

function RoleToggle({ label, value, onChange }) {
  return (
    <div style={row}>
      <div>{label}</div>
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

/* 🔥 STYLES */

const topBar = { display:"flex",alignItems:"center",marginBottom:15 };
const backBtn = { padding:"6px 10px",borderRadius:8,border:"none",background:"#e5e7eb",cursor:"pointer",marginRight:10 };
const title = { fontWeight:600,fontSize:18 };

const profile = { textAlign:"center" };
const avatar = { width:90,height:90,borderRadius:"50%",objectFit:"cover",marginBottom:10 };

const searchBox = { width:"100%",padding:12,borderRadius:10,border:"1px solid #ddd" };
const userRow = { background:"#fff",padding:12,borderRadius:10,marginBottom:8,cursor:"pointer",boxShadow:"0 4px 10px rgba(0,0,0,0.05)" };
const sub = { fontSize:12,color:"#64748b" };

const input = { width:"100%",padding:10,borderRadius:8,border:"1px solid #ddd" };
const labelStyle = { fontSize:12,color:"#64748b" };

const row = { display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10 };

const resetBtn = { marginTop:20,padding:12,borderRadius:10,background:"#2563eb",color:"#fff",border:"none",cursor:"pointer" };
