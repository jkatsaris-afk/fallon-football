import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

/* IMAGE COMPRESS */
const compressImage = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");

      const MAX_WIDTH = 800;
      const scale = MAX_WIDTH / img.width;

      canvas.width = MAX_WIDTH;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
    };
  });
};

export default function RefProfile() {
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    const { data } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle();

    setRef(data);
    setForm(data || {});
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!ref) return;

    let filePath = ref.profile_image;

    if (file) {
      filePath = `${Date.now()}.jpg`;
      const compressedFile = await compressImage(file);

      await supabase.storage
        .from("profile-images")
        .upload(filePath, compressedFile, {
          contentType: "image/jpeg"
        });
    }

    await supabase
      .from("referees")
      .update({
        phone: form.phone,
        experience: form.experience,
        availability: form.availability,
        notes: form.notes,
        profile_image: filePath
      })
      .eq("id", ref.id);

    setEditing(false);
    setFile(null);
    loadProfile();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const getImageUrl = () => {
    if (!ref?.profile_image) return "/default-profile.png";

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(ref.profile_image);

    return data.publicUrl;
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!ref) return <div style={{ padding: 20 }}>No profile found</div>;

  return (
    <div style={wrap}>
      <h2 style={title}>My Profile</h2>

      <div style={card}>

        {/* PROFILE IMAGE */}
        <div style={imageWrap}>
          <img src={getImageUrl()} alt="profile" style={profileImg} />
        </div>

        {editing && (
          <div style={uploadWrap}>
            <label style={uploadBtn}>
              Change Photo
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>
          </div>
        )}

        {/* NAME */}
        <div style={name}>
          {ref.first_name} {ref.last_name}
        </div>

        {/* EMAIL */}
        <div style={field}>
          <div style={label}>Email</div>
          <div>{ref.email}</div>
        </div>

        {/* PHONE */}
        <div style={field}>
          <div style={label}>Phone</div>
          {editing ? (
            <input
              style={input}
              value={form.phone || ""}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />
          ) : (
            <div>{ref.phone || "-"}</div>
          )}
        </div>

        {/* EXPERIENCE */}
        <div style={field}>
          <div style={label}>Experience</div>
          {editing ? (
            <textarea
              style={textarea}
              value={form.experience || ""}
              onChange={(e) =>
                setForm({ ...form, experience: e.target.value })
              }
            />
          ) : (
            <div>{ref.experience || "-"}</div>
          )}
        </div>

        {/* BUTTONS */}
        <div style={buttonRow}>
          {!editing ? (
            <button style={btn} onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <>
              <button style={btn} onClick={saveProfile}>
                Save
              </button>
              <button style={cancelBtn} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </>
          )}
        </div>

        {/* LOGOUT */}
        <button style={logoutBtn} onClick={logout}>
          Log Out
        </button>

      </div>
    </div>
  );
}

/* STYLES */

const wrap = {
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 20,
  alignItems: "center" // 🔥 keeps centered nicely
};

const title = {
  fontSize: 24,
  fontWeight: 700
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 24,
  width: "100%",
  maxWidth: 800,   // 🔥 FIXED WIDTH (not skinny anymore)
  margin: "auto",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const imageWrap = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 10
};

const profileImg = {
  width: 140,
  height: 140,
  borderRadius: "50%",
  objectFit: "cover"
};

const uploadWrap = {
  textAlign: "center",
  marginBottom: 10
};

const name = {
  fontSize: 20,
  fontWeight: 700,
  textAlign: "center",
  marginBottom: 10
};

const field = {
  marginTop: 14
};

const label = {
  fontSize: 12,
  color: "#64748b"
};

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb"
};

const textarea = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  minHeight: 80
};

const buttonRow = {
  marginTop: 20,
  display: "flex",
  gap: 10,
  justifyContent: "center"
};

const btn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: 10,
  cursor: "pointer"
};

const cancelBtn = {
  background: "#64748b",
  color: "#fff",
  border: "none",
  padding: "10px 16px",
  borderRadius: 10
};

const uploadBtn = {
  background: "#16a34a",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 10,
  cursor: "pointer"
};

const logoutBtn = {
  marginTop: 20,
  background: "rgba(220,38,38,0.12)",
  color: "#b91c1c",
  border: "1px solid rgba(220,38,38,0.25)",
  padding: "10px 16px",
  borderRadius: 10,
  cursor: "pointer",
  width: "100%"
};
