import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefSignUpPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

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
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error("Settings load error:", err);
      setSettings({ ref_signups_open: true }); // fallback so page doesn't go blank
    }
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!file) {
      alert("Profile picture is required");
      return;
    }

    setLoading(true);

    try {
      /* 1. SIGN UP */
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

      if (authError) throw authError;

      /* 2. LOGIN (CRITICAL FOR RLS) */
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

      if (loginError) throw loginError;

      const user = loginData?.user;

      if (!user) throw new Error("User authentication failed");

      /* 3. UPLOAD IMAGE */
      const fileName = `${user.id}-${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      /* 4. INSERT REFEREE */
      const { error: insertError } = await supabase
        .from("referees")
        .insert([
          {
            auth_id: user.id,
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            email: form.email,
            age: Number(form.age || 0),
            experience: form.experience,
            availability: form.availability,
            notes: form.notes,
            profile_image: fileName,
            status: "pending"
          }
        ]);

      if (insertError) throw insertError;

      alert("Account Created!");

    } catch (err) {
      console.error("FULL ERROR:", err);
      alert(err.message);
    }

    setLoading(false);
  };

  if (!settings) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={container}>
      <h2 style={{ marginBottom: 20 }}>Referee Registration</h2>

      <Card>
        <div style={payBox}>
          Referees are paid <strong>$20 per game</strong>.
        </div>
      </Card>

      {!settings.ref_signups_open && (
        <Card center>
          <h3>Registration Closed</h3>
        </Card>
      )}

      {settings.ref_signups_open && (
        <>
          <Card>
            <Section title="Basic Info">
              <Input placeholder="First Name" onChange={(v)=>setForm({...form, firstName:v})}/>
              <Input placeholder="Last Name" onChange={(v)=>setForm({...form, lastName:v})}/>
              <Input placeholder="Phone" onChange={(v)=>setForm({...form, phone:v})}/>
              <Input placeholder="Email" onChange={(v)=>setForm({...form, email:v})}/>
              <Input placeholder="Password" type="password" onChange={(v)=>setForm({...form, password:v})}/>
              <Input placeholder="Age" type="number" onChange={(v)=>setForm({...form, age:v})}/>

              <div style={uploadWrap}>
                <label style={uploadBtn}>
                  Upload Profile Picture (Required)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e)=>setFile(e.target.files[0])}
                    hidden
                  />
                </label>

                {file && <div style={fileName}>{file.name}</div>}
              </div>
            </Section>
          </Card>

          <Card>
            <Section title="Experience">
              <textarea
                placeholder="Describe experience"
                onChange={(e)=>setForm({...form, experience:e.target.value})}
                style={textarea}
              />
            </Section>
          </Card>

          <Card>
            <Section title="Availability">
              <textarea
                placeholder="Days / times available"
                onChange={(e)=>setForm({...form, availability:e.target.value})}
                style={textarea}
              />
            </Section>
          </Card>

          <Card>
            <textarea
              placeholder="Additional notes"
              onChange={(e)=>setForm({...form, notes:e.target.value})}
              style={textarea}
            />
          </Card>

          <button onClick={handleSubmit} style={submitBtn}>
            {loading ? "Submitting..." : "Register Referee"}
          </button>
        </>
      )}
    </div>
  );
}

/* ================= UI ================= */

function Card({ children, center }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: 20,
      marginBottom: 15,
      textAlign: center ? "center" : "left",
      boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
    }}>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
      style={input}
    />
  );
}

/* ================= STYLES ================= */

const container = {
  padding: 20,
  maxWidth: 500,
  margin: "auto"
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 16,
  width: "100%",
  boxSizing: "border-box"
};

const textarea = {
  width: "100%",
  minHeight: 80,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  resize: "vertical",
  fontSize: 16
};

const uploadWrap = {
  marginTop: 10
};

const uploadBtn = {
  display: "inline-block",
  padding: "10px 14px",
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

const submitBtn = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  fontWeight: 600
};

const payBox = {
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  padding: 12,
  borderRadius: 10,
  color: "#166534",
  textAlign: "center"
};
