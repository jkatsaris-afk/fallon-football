import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";

export default function RefSignUpPage({ setPage }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  const fileRef = useRef();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    age: "",
    experience: "",
    availability: "",
    notes: ""
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setSettings(data);
  };

  /* ================= IMAGE UPLOAD ================= */

  const uploadImage = async (file, userId) => {
    const filePath = `${userId}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("ref-avatars")
      .upload(filePath, file);

    if (error) {
      console.error(error);
      return null;
    }

    const { data } = supabase.storage
      .from("ref-avatars")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!settings) return alert("Settings not loaded");

    if (
      !form.firstName ||
      !form.lastName ||
      !form.phone ||
      !form.email ||
      !form.password ||
      !image
    ) {
      return alert("Please complete all required fields and upload a photo");
    }

    setLoading(true);

    // 🔥 CREATE USER
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // 🔥 UPLOAD IMAGE
    const imageUrl = await uploadImage(image, userId);

    // 🔥 SAVE REF PROFILE
    const { error } = await supabase.from("referees").insert([
      {
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        email: form.email,
        age: Number(form.age),
        experience: form.experience,
        availability: form.availability,
        notes: form.notes,
        season_id: settings.current_season,
        auth_id: userId,
        profile_image: imageUrl
      }
    ]);

    if (error) {
      console.error(error);
      alert("Error saving referee");
      setLoading(false);
      return;
    }

    alert("Account created! You are now logged in.");

    setPage("refDashboard");

    setLoading(false);
  };

  if (!settings) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>

      {!settings.ref_signups_open && (
        <Card center>
          <h2>Referee Registration Closed</h2>
        </Card>
      )}

      {settings.ref_signups_open && (
        <>
          <h2>Referee Registration</h2>

          {/* 🔥 AVATAR */}
          <div style={avatarWrapper}>
            <div
              style={avatarContainer}
              onClick={() => fileRef.current.click()}
            >
              <img
                src={
                  image
                    ? URL.createObjectURL(image)
                    : "/default-avatar.png"
                }
                alt="avatar"
                style={avatarImg}
              />
              <div style={avatarOverlay}>Change</div>
            </div>

            <div style={avatarLabel}>Profile Photo (required)</div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setImage(e.target.files[0])}
          />

          <Card>
            <Section title="Basic Info">
              <Input placeholder="First Name" onChange={(v)=>setForm({...form, firstName:v})}/>
              <Input placeholder="Last Name" onChange={(v)=>setForm({...form, lastName:v})}/>
              <Input placeholder="Phone" onChange={(v)=>setForm({...form, phone:v})}/>
              <Input placeholder="Email" onChange={(v)=>setForm({...form, email:v})}/>
              <Input type="password" placeholder="Create Password" onChange={(v)=>setForm({...form, password:v})}/>
              <Input placeholder="Age" type="number" onChange={(v)=>setForm({...form, age:v})}/>
            </Section>
          </Card>

          <Card>
            <Section title="Experience">
              <textarea
                placeholder="Describe experience"
                onChange={(e)=>setForm({...form, experience:e.target.value})}
                style={textareaStyle}
              />
            </Section>
          </Card>

          <Card>
            <Section title="Availability">
              <textarea
                placeholder="Days / times available"
                onChange={(e)=>setForm({...form, availability:e.target.value})}
                style={textareaStyle}
              />
            </Section>
          </Card>

          <button onClick={handleSubmit} style={submitBtn}>
            {loading ? "Creating Account..." : "Register"}
          </button>
        </>
      )}
    </div>
  );
}

/* COMPONENTS */

function Card({ children, center }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: 20,
      marginBottom: 15,
      boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
      textAlign: center ? "center" : "left"
    }}>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {children}
      </div>
    </div>
  );
}

function Input({ placeholder, onChange, type="text" }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      onChange={(e)=>onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

/* STYLES */

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  fontSize: 14
};

const textareaStyle = {
  width: "100%",
  minHeight: 100,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  resize: "vertical",
  fontSize: 14
};

const submitBtn = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600,
  marginTop: 10
};

const avatarWrapper = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: 20
};

const avatarContainer = {
  width: 110,
  height: 110,
  borderRadius: "50%",
  overflow: "hidden",
  cursor: "pointer",
  position: "relative",
  border: "2px solid #e2e8f0"
};

const avatarImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const avatarOverlay = {
  position: "absolute",
  bottom: 0,
  width: "100%",
  background: "rgba(0,0,0,0.5)",
  color: "#fff",
  fontSize: 12,
  textAlign: "center",
  padding: 4
};

const avatarLabel = {
  marginTop: 8,
  fontSize: 12,
  color: "#64748b"
};
