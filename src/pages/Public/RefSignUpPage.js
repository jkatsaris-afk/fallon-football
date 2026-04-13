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
      console.error("UPLOAD ERROR:", error);
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

    try {
      // 🔥 CREATE USER
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: form.email,
          password: form.password
        });

      console.log("SIGNUP:", authData, authError);

      if (authError) throw authError;

      const userId = authData?.user?.id;

      // 🔥 IF EMAIL CONFIRMATION IS ON
      if (!userId) {
        alert("Account created. Please check your email to confirm.");
        setPage("refLogin");
        return;
      }

      // 🔥 UPLOAD IMAGE
      const imageUrl = await uploadImage(image, userId);

      // 🔥 SAVE REF PROFILE
      const { error: dbError } = await supabase
        .from("referees")
        .insert([
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

      console.log("DB SAVE:", dbError);

      if (dbError) throw dbError;

      // 🔥 LOGIN USER
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

      console.log("LOGIN:", loginError);

      if (loginError) {
        alert("Account created! Please log in.");
        setPage("refLogin");
        return;
      }

      // 🔥 SUCCESS → GO TO DASHBOARD
      setPage("refDashboard");

    } catch (err) {
      console.error("ERROR:", err);
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false); // 🔥 ALWAYS RESET
    }
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

              <Input placeholder="First Name" onChange={(v)=>setForm({...form, firstName:v})}/>
              <Input placeholder="Last Name" onChange={(v)=>setForm({...form, lastName:v})}/>
              <Input placeholder="Phone" onChange={(v)=>setForm({...form, phone:v})}/>
              <Input placeholder="Email" onChange={(v)=>setForm({...form, email:v})}/>
              <Input type="password" placeholder="Create Password" onChange={(v)=>setForm({...form, password:v})}/>
              <Input placeholder="Age" type="number" onChange={(v)=>setForm({...form, age:v})}/>

              {/* 🔥 CLEAN PROFILE UPLOAD */}
              <div style={uploadRow}>
                <div style={uploadLabel}>Profile Photo</div>

                <button
                  type="button"
                  style={uploadBtn}
                  onClick={() => fileRef.current.click()}
                >
                  {image ? "Photo Selected" : "Upload Photo"}
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setImage(e.target.files[0])}
                />
              </div>

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

const uploadRow = {
  marginTop: 10
};

const uploadLabel = {
  fontSize: 13,
  color: "#374151"
};

const uploadBtn = {
  marginTop: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer"
};
