import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function CoachSignUpPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    division: "",
    assistant: false,
    coachedBefore: false,
    experience: "",
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
      .single();

    setSettings(data);
  };

  const handleSubmit = async () => {
    setLoading(true);

    await supabase.from("coaches").insert([
      {
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        email: form.email,
        division_preference: form.division,
        assistant_coach: form.assistant,
        has_coached_before: form.coachedBefore,
        experience_details: form.experience,
        notes: form.notes,
        season_id: settings.current_season
      }
    ]);

    alert("✅ Coach Registered!");
    setLoading(false);
  };

  if (!settings) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>

      {!settings.coach_signups_open && (
        <Card center>
          <h2>🚫 Coach Registration Closed</h2>
          <p>Coach signups are currently closed.</p>
        </Card>
      )}

      {settings.coach_signups_open && (
        <>
          <h2>🏈 Coach Registration</h2>

          <Card>
            <Section title="Basic Info">
              <Input placeholder="First Name" onChange={(v)=>setForm({...form, firstName:v})}/>
              <Input placeholder="Last Name" onChange={(v)=>setForm({...form, lastName:v})}/>
              <Input placeholder="Phone" onChange={(v)=>setForm({...form, phone:v})}/>
              <Input placeholder="Email" onChange={(v)=>setForm({...form, email:v})}/>
            </Section>
          </Card>

          <Card>
            <Section title="Preferences">
              <Select
                value={form.division}
                onChange={(v)=>setForm({...form, division:v})}
                options={[
                  ["K-1","K-1"],
                  ["2nd-3rd","2nd-3rd"],
                  ["4th-5th","4th-5th"],
                  ["6th+","6th+"]
                ]}
              />

              <label>
                <input
                  type="checkbox"
                  onChange={(e)=>setForm({...form, assistant:e.target.checked})}
                />
                Assistant Coach
              </label>
            </Section>
          </Card>

          <Card>
            <Section title="Experience">
              <label>
                <input
                  type="checkbox"
                  onChange={(e)=>setForm({...form, coachedBefore:e.target.checked})}
                />
                Have coached before
              </label>

              <textarea
                placeholder="Describe experience"
                onChange={(e)=>setForm({...form, experience:e.target.value})}
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
            {loading ? "Submitting..." : "Register Coach"}
          </button>
        </>
      )}
    </div>
  );
}

/* ================= UI ================= */

function Card({ children, center }) {
  return (
    <div
      style={{
        background: "#fff",
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

function Input({ placeholder, onChange }) {
  return (
    <input
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
      <option value="">Select Division</option>
      {options.map(([v,l])=>(
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0"
};

/* ✅ FIXED TEXTAREA */
const textareaStyle = {
  width: "100%",
  minHeight: 80,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box",   // ✅ prevents overflow
  resize: "vertical",        // ✅ prevents sideways stretch
  fontFamily: "inherit",
  fontSize: 14
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
