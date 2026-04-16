import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function CoachSignUpPage() {
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

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    if (!file) {
      alert("Profile picture is required");
      return;
    }

    setLoading(true);

    try {
      /* 🔥 SIGN UP */
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

      if (authError) throw authError;

      /* 🔥 LOGIN */
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

      if (loginError) throw loginError;

      const user = loginData?.user;
      if (!user) throw new Error("Auth failed");

      /* 🔥 UPLOAD IMAGE */
      const fileName = `${user.id}-${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      /* 🔥 INSERT COACH */
      const { error: insertError } = await supabase
        .from("coaches")
        .insert([
          {
            auth_id: user.id,
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            email: form.email,
            age: Number(form.age || 0),
            experience: form.experience,
            notes: form.notes,
            profile_image: fileName,
            division_preference: form.division,
            assistant_coach: form.assistant,
            has_coached_before: form.coachedBefore,
            status: "pending"
          }
        ]);

      if (insertError) throw insertError;

      alert("Coach Registered!");

      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        password: "",
        age: "",
        division: "",
        assistant: false,
        coachedBefore: false,
        experience: "",
        notes: ""
      });

      setFile(null);

    } catch (err) {
      console.error(err);
      alert(err.message);
    }

    setLoading(false);
  };

  if (!settings) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={container}>

      {!settings.coach_signups_open && (
        <Card center>
          <h3>Registration Closed</h3>
        </Card>
      )}

      {settings.coach_signups_open && (
        <>
          <h2>Coach Registration</h2>

          <Card>
            <Section title="Basic Info">
              <Input placeholder="First Name" value={form.firstName} onChange={(v)=>setForm({...form, firstName:v})}/>
              <Input placeholder="Last Name" value={form.lastName} onChange={(v)=>setForm({...form, lastName:v})}/>
              <Input placeholder="Phone" value={form.phone} onChange={(v)=>setForm({...form, phone:v})}/>
              <Input placeholder="Email" value={form.email} onChange={(v)=>setForm({...form, email:v})}/>
              <Input placeholder="Password" type="password" value={form.password} onChange={(v)=>setForm({...form, password:v})}/>
              <Input placeholder="Age" type="number" value={form.age} onChange={(v)=>setForm({...form, age:v})}/>

              <input type="file" onChange={(e)=>setFile(e.target.files[0])}/>
            </Section>
          </Card>

          <Card>
            <Section title="Preferences">
              <Input placeholder="Division Preference" value={form.division} onChange={(v)=>setForm({...form, division:v})}/>

              <label>
                <input type="checkbox" checked={form.assistant} onChange={(e)=>setForm({...form, assistant:e.target.checked})}/>
                Assistant Coach
              </label>
            </Section>
          </Card>

          <Card>
            <Section title="Experience">
              <label>
                <input type="checkbox" checked={form.coachedBefore} onChange={(e)=>setForm({...form, coachedBefore:e.target.checked})}/>
                Coached Before
              </label>

              <textarea
                value={form.experience}
                onChange={(e)=>setForm({...form, experience:e.target.value})}
                style={textarea}
              />
            </Section>
          </Card>

          <Card>
            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e)=>setForm({...form, notes:e.target.value})}
              style={textarea}
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

/* UI COMPONENTS */

function Card({ children }) {
  return (
    <div style={card}>
      {children}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Input({ placeholder, onChange, type="text", value }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e)=>onChange(e.target.value)}
      style={input}
    />
  );
}

/* STYLES */

const container = {
  padding: 20,
  maxWidth: 500,
  margin: "auto"
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  marginBottom: 15
};

const sectionTitle = {
  fontWeight: 600,
  marginBottom: 10
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  width: "100%",
  marginBottom: 10
};

const textarea = {
  width: "100%",
  minHeight: 80,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginTop: 10
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
