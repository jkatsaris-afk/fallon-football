import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function RefSignUpPage({ setPage }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "", // 🔥 NEW
    age: "",
    experience: "",
    availability: "",
    notes: ""
  });

  useEffect(() => {
    loadSettings();
  }, []);

  /* ================= LOAD SETTINGS ================= */

  const loadSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setSettings(data);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!settings) {
      alert("Settings not loaded yet");
      return;
    }

    if (!form.email || !form.password) {
      alert("Email and password required");
      return;
    }

    setLoading(true);

    // 🔥 1. CREATE AUTH USER (AUTO LOGIN)
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

    if (authError) {
      console.error(authError);
      alert(authError.message);
      setLoading(false);
      return;
    }

    const userId = authData?.user?.id;

    // 🔥 2. INSERT REF PROFILE
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
        auth_id: userId
      }
    ]);

    if (error) {
      console.error(error);
      alert("Error saving referee");
      setLoading(false);
      return;
    }

    // 🔥 3. AUTO REDIRECT TO REF DASHBOARD
    setPage("refDashboard");

    setLoading(false);
  };

  /* ================= LOADING ================= */

  if (!settings || !settings.id) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>

      {!settings.ref_signups_open && (
        <Card center>
          <h2>🚫 Referee Registration Closed</h2>
        </Card>
      )}

      {settings.ref_signups_open && (
        <>
          <h2>🏈 Referee Registration</h2>

          <Card>
            <Section title="Basic Info">
              <Input placeholder="First Name" onChange={(v)=>setForm({...form, firstName:v})}/>
              <Input placeholder="Last Name" onChange={(v)=>setForm({...form, lastName:v})}/>
              <Input placeholder="Phone" onChange={(v)=>setForm({...form, phone:v})}/>
              <Input placeholder="Email" onChange={(v)=>setForm({...form, email:v})}/>
              
              {/* 🔥 PASSWORD FIELD */}
              <Input
                placeholder="Create Password"
                type="password"
                onChange={(v)=>setForm({...form, password:v})}
              />

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

          <Card>
            <textarea
              placeholder="Additional notes"
              onChange={(e)=>setForm({...form, notes:e.target.value})}
              style={textareaStyle}
            />
          </Card>

          <button onClick={handleSubmit} style={submitBtn}>
            {loading ? "Creating Account..." : "Register & Login"}
          </button>
        </>
      )}
    </div>
  );
}

/* UI */

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
      style={inputStyle}
    />
  );
}

/* STYLES */

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0"
};

const textareaStyle = {
  width: "100%",
  minHeight: 80,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0"
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
