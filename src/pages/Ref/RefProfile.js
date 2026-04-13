import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefProfile() {
  const [user, setUser] = useState(null);
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
    const currentUser = authData?.user;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    setUser(currentUser);

    const { data } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", currentUser.id)
      .maybeSingle();

    setRef(data);
    setForm(data || {});
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!ref) return;

    let filePath = ref.profile_image;

    // 🔥 Upload new image if selected
    if (file) {
      filePath = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file);

      if (uploadError) {
        console.error(uploadError);
        alert("Image upload failed");
        return;
      }
    }

    const { error } = await supabase
      .from("referees")
      .update({
        phone: form.phone,
        experience: form.experience,
        availability: form.availability,
        notes: form.notes,
        profile_image: filePath
      })
      .eq("id", ref.id);

    if (error) {
      console.error(error);
      alert("Failed to save");
      return;
    }

    setEditing(false);
    setFile(null);
    loadProfile();
  };

  // 🔥 CORRECT IMAGE URL BUILDER
  const getImageUrl = () => {
    if (!ref?.profile_image) return "/default-profile.png";

    const { data } = supabase.storage
      .from("profile-images")
      .getPublicUrl(ref.profile_image);

    return data.publicUrl;
  };

  /* ================= SAFE RENDER ================= */

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!ref || !ref.id) {
    return <div style={{ padding: 20 }}>No profile found</div>;
  }

  return (
    <div style={container}>
      <h2 style={{ marginBottom: 20 }}>My Profile</h2>

      <div style={card}>

        {/* PROFILE IMAGE */}
        <div style={imageWrap}>
          <img
            src={getImageUrl()}
            alt="profile"
            style={profileImg}
          />
        </div>

        {/* UPLOAD BUTTON */}
        {editing && (
          <div style={{ textAlign: "center", marginBottom: 15 }}>
            <label style={uploadBtn}>
              Change Profile Picture
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                hidden
              />
            </label>

            {file && (
              <div style={fileName}>
                {file.name}
              </div>
            )}
          </div>
        )}

        {/* NAME */}
        <h3>
          {ref.first_name} {ref.last_name}
        </h3>

        {/* STATUS */}
        <div style={status(ref.status)}>
          {ref.status || "pending"}
        </div>

        {/* ROLE */}
        <div style={{ marginBottom: 10 }}>
          {ref.role || "Assistant Ref"}
        </div>

        {/* EMAIL */}
        <div style={label}>Email</div>
        <div>{ref.email}</div>

        {/* PHONE */}
        <div style={label}>Phone</div>
        {editing ? (
          <input
            value={form.phone || ""}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value })
            }
            style={input}
          />
        ) : (
          <div>{ref.phone || "-"}</div>
        )}

        {/* EXPERIENCE */}
        <div style={label}>Experience</div>
        {editing ? (
          <textarea
            value={form.experience || ""}
            onChange={(e) =>
              setForm({ ...form, experience: e.target.value })
            }
            style={textarea}
          />
        ) : (
          <div>{ref.experience || "-"}</div>
        )}

        {/* AVAILABILITY */}
        <div style={label}>Availability</div>
        {editing ? (
          <textarea
            value={form.availability || ""}
            onChange={(e) =>
              setForm({ ...form, availability: e.target.value })
            }
            style={textarea}
          />
        ) : (
          <div>{ref.availability || "-"}</div>
        )}

        {/* NOTES */}
        <div style={label}>Notes</div>
        {editing ? (
          <textarea
            value={form.notes || ""}
            onChange={(e) =>
              setForm({ ...form, notes: e.target.value })
            }
            style={textarea}
          />
        ) : (
          <div>{ref.notes || "-"}</div>
        )}

        {/* BUTTONS */}
        <div style={{ marginTop: 20 }}>
          {!editing ? (
            <button style={btn} onClick={() => setEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <>
              <button style={btn} onClick={saveProfile}>
                Save
              </button>
              <button
                style={cancelBtn}
                onClick={() => {
                  setEditing(false);
                  setFile(null);
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const container = { padding: 20 };

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
  maxWidth: 500,
  margin: "auto"
};

const imageWrap = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 15
};

const profileImg = {
  width: 100,
  height: 100,
  borderRadius: "50%",
  objectFit: "cover"
};

const label = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 12
};

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 16
};

const textarea = {
  width: "100%",
  minHeight: 80,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 16
};

const btn = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  marginRight: 10
};

const cancelBtn = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#64748b",
  color: "#fff"
};

const uploadBtn = {
  display: "inline-block",
  padding: "8px 14px",
  borderRadius: 10,
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14
};

const fileName = {
  marginTop: 6,
  fontSize: 12,
  color: "#64748b"
};

const status = (s) => ({
  color:
    s === "approved"
      ? "#16a34a"
      : s === "denied"
      ? "#dc2626"
      : "#f59e0b",
  fontWeight: "600",
  marginBottom: 10
});
