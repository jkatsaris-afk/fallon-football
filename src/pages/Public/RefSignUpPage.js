import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function RefSignUpPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
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
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle(); // 🔥 safer than .single()

    if (error) {
      console.error("Settings load error:", error);
    }

    console.log("SETTINGS:", data); // 🔥 DEBUG

    setSettings(data);
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!settings) {
      alert("Settings not loaded yet");
      return;
    }

    setLoading(true);

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
        season_id: settings?.current_season || null
      }
    ]);

    if (error) {
      console.error(error);
      alert("Error submitting form");
      setLoading(false);
      return;
    }

    alert("✅ Referee Registered!");

    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      age: "",
      experience: "",
      availability: "",
      notes: ""
    });

    setLoading(false);
  };

  /* ================= LOADING ================= */

  if (!settings || !settings.id) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Loading settings...</h3>

        {/* 🔥 DEBUG VIEW */}
        <pre>{JSON.stringify(settings, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>

      {/* 🔒 CLOSED */}
      {!settings.ref_signups_open && (
        <Card center>
          <h2>🚫 Referee Registration Closed</h2>
          <p>Ref signups are currently closed.</p>
        </Card>
      )}

      {/* ✅ OPEN */}
      {settings.ref_signups_open && (
        <>
          <h2>🏈 Referee Registration</h2>

          <Card>
            <Section title="Basic Info">
              <Input placeholder="First Name" value={form.firstName} onChange={(v)=>setForm({...form, firstName:v})}/>
              <Input placeholder="Last Name" value={form.lastName} onChange={(v)=>setForm({...form, lastName:v})}/>
              <Input placeholder="Phone" value={form.phone} onChange={(v)=>setForm({...form, phone:v})}/>
              <Input placeholder="Email" value={form.email} onChange={(v)=>setForm({...form, email:v})}/>
              <Input placeholder="Age" type="number" value={form.age} onChange={(v)=>setForm({...form, age:v})}/>
            </Section>
          </Card>

          <Card>
            <Section title="Experience">
              <textarea
                placeholder="Describe experience"
                value={form.experience}
                onChange={(e)=>setForm({...form, experience:e.target.value})}
                style={textareaStyle}
              />
            </Section>
          </Card>

          <Card>
            <Section title="Availability">
              <textarea
                placeholder="Days / times available"
                value={form.availability}
                onChange={(e)=>setForm({...form, availability:e.target.value})}
                style={textareaStyle}
              />
            </Section>
          </Card>

          <Card>
            <textarea
              placeholder="Additional notes"
              value={form.notes}
              onChange={(e)=>setForm({...form, notes:e.target.value})}
              style={textareaStyle}
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

function Input({ placeholder, value, onChange, type="text" }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

/* ================= STYLES ================= */

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
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",
  resize: "vertical"
};

const submitBtn = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  fontWeight: 600,
  marginTop: 10
};
