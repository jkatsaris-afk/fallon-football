import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefProfile() {
  const [user, setUser] = useState(null);
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null); // 🔥 NEW

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user;

    if (!currentUser) return;

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
    let fileName = ref.profile_image;

    // 🔥 UPLOAD NEW IMAGE IF SELECTED
    if (file) {
      fileName = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      if (uploadError) {
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
        profile_image: fileName // 🔥 SAVE IMAGE
      })
      .eq("id", ref.id);

    if (error) {
      alert("Failed to save");
      return;
    }

    setEditing(false);
    setFile(null);
    loadProfile();
  };

  const getImageUrl = () => {
    if (!ref.profile_image) return "/default-profile.png";

    return `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/profile-images/${ref.profile_image}`;
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!ref) return <div style={{ padding: 20 }}>No profile found</div>;

  return (
    <div style={container}>
      <h2 style={{ marginBottom: 20 }}>My Profile</h2>

      <div style={card}>

        {/* 🔥 PROFILE IMAGE */}
        <div style={imageWrap}>
          <img
            src={getImageUrl()}
            alt="profile"
            style={profileImg}
          />
        </div>

        {/* 🔥 UPLOAD BUTTON (ONLY WHEN EDITING) */}
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
