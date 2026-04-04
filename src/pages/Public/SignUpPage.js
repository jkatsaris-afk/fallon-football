import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    experience: "beginner",
    shirtSize: "YM",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    waiver: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single();

    setSettings(data);
  };

  const getDivision = (age) => {
    if (age <= 5) return "K-1";
    if (age <= 7) return "2nd-3rd";
    if (age <= 9) return "4th-5th";
    return "6th+";
  };

  const handleSubmit = async () => {
    if (!form.waiver) {
      alert("You must agree to the waiver");
      return;
    }

    setLoading(true);

    const division = getDivision(Number(form.age));

    await supabase.from("players").insert([
      {
        first_name: form.firstName,
        last_name: form.lastName,
        age: Number(form.age),
        experience_level: form.experience,
        division,
        shirt_size: form.shirtSize,
        season_id: settings.current_season,
        waiver_signed: true,
        registration_fee: settings.registration_fee,
        payment_status: "unpaid"
      }
    ]);

    alert("✅ Registered!");
    setLoading(false);
  };

  if (!settings) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>

      {/* 🔒 CLOSED */}
      {!settings.signups_open && (
        <Card center>
          <h2>🚫 Registration Closed</h2>
          <p>Signups are currently closed.</p>
        </Card>
      )}

      {/* ✅ FORM */}
      {settings.signups_open && (
        <>
          <h2 style={{ marginBottom: 10 }}>🏈 Player Registration</h2>
          <p style={{ color: "#64748b", marginBottom: 20 }}>
            Season {settings.current_season}
          </p>

          <Card>
            <Section title="Player Info">

              <Input
                placeholder="First Name"
                value={form.firstName}
                onChange={(v)=>setForm({...form, firstName:v})}
              />

              <Input
                placeholder="Last Name"
                value={form.lastName}
                onChange={(v)=>setForm({...form, lastName:v})}
              />

              <Input
                placeholder="Age"
                type="number"
                value={form.age}
                onChange={(v)=>setForm({...form, age:v})}
              />

              <Select
                value={form.experience}
                onChange={(v)=>setForm({...form, experience:v})}
                options={[
                  ["beginner","Beginner"],
                  ["intermediate","Intermediate"],
                  ["experienced","Experienced"]
                ]}
              />

              <Select
                value={form.shirtSize}
                onChange={(v)=>setForm({...form, shirtSize:v})}
                options={[
                  ["YS","Youth S"],
                  ["YM","Youth M"],
                  ["YL","Youth L"],
                  ["AS","Adult S"],
                  ["AM","Adult M"],
                  ["AL","Adult L"]
                ]}
              />

            </Section>
          </Card>

          <Card>
            <Section title="Parent Info">

              <Input
                placeholder="Parent Name"
                value={form.parentName}
                onChange={(v)=>setForm({...form, parentName:v})}
              />

              <Input
                placeholder="Phone"
                value={form.parentPhone}
                onChange={(v)=>setForm({...form, parentPhone:v})}
              />

              <Input
                placeholder="Email"
                value={form.parentEmail}
                onChange={(v)=>setForm({...form, parentEmail:v})}
              />

            </Section>
          </Card>

          <Card>
            <label style={{ display: "flex", gap: 10 }}>
              <input
                type="checkbox"
                checked={form.waiver}
                onChange={(e)=>setForm({...form, waiver:e.target.checked})}
              />
              I agree to the waiver
            </label>
          </Card>

          <button
            onClick={handleSubmit}
            style={submitBtn}
          >
            {loading
              ? "Submitting..."
              : `Register ($${settings.registration_fee})`}
          </button>
        </>
      )}
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

function Card({ children, center }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        textAlign: center ? "center" : "left"
      }}
    >
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
      value={value}
      placeholder={placeholder}
      onChange={(e)=>onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      style={inputStyle}
    >
      {options.map(([val,label])=>(
        <option key={val} value={val}>{label}</option>
      ))}
    </select>
  );
}

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 14
};

const submitBtn = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  marginTop: 10
};
