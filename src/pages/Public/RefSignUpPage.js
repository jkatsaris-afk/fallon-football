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

    if (error) return null;

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

    const imageUrl = await uploadImage(image, userId);

    await supabase.from("referees").insert([
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

          <Card>
            <Section title="Basic Info">

              {/* 🔥 PROFILE IMAGE (CLEAN VERSION) */}
              <div style={avatarSection}>
                <img
                  src={
                    image
                      ? URL.createObjectURL(image)
                      : "/default-avatar.png"
                  }
                  alt="avatar"
                  style={avatarImg}
                />

                <button
                  type="button"
                  style={uploadBtn}
                  onClick={() => fileRef.current.click()}
                >
                  Upload Photo
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setImage(e.target.files[0])}
                />
              </div>

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
  boxSizing: "border-box"
};

const textareaStyle = {
  width: "100%",
  minHeight: 100,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  resize: "vertical"
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

/* 🔥 CLEAN AVATAR */

const avatarSection = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: 10
};

const avatarImg = {
  width: 90,
  height: 90,
  borderRadius: "50%",
  objectFit: "cover",
  border: "2px solid #e5e7eb"
};

const uploadBtn = {
  marginTop: 8,
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 13
};
