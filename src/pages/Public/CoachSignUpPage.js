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
      alert("Profile picture required");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      });

      if (authError) throw authError;

      const { data: loginData } =
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });

      const user = loginData?.user;

      const fileName = `${user.id}-${Date.now()}-${file.name}`;

      await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      await supabase.from("coaches").insert([
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

      alert("Coach Registered!");

    } catch (err) {
      console.error(err);
      alert(err.message);
    }

    setLoading(false);
  };

  /* ================= CLOSED SCREEN ================= */

  if (!settings) return <div style={{ padding: 20 }}>Loading...</div>;

  if (!settings.coach_signups_open) {
    return (
      <div style={centerWrap}>
        <div style={centerCard}>
          <h2>Registration Closed</h2>
          <p style={subText}>
            Coach registration is currently closed.
          </p>
        </div>
      </div>
    );
  }

  /* ================= FORM ================= */

  return (
    <div style={wrap}>

      <h2 style={title}>Coach Registration</h2>

      {/* BASIC INFO */}
      <div style={card}>
        <div style={sectionTitle}>Basic Info</div>

        <div style={grid}>
          <input style={input} placeholder="First Name" onChange={(e)=>setForm({...form, firstName:e.target.value})}/>
          <input style={input} placeholder="Last Name" onChange={(e)=>setForm({...form, lastName:e.target.value})}/>
          <input style={input} placeholder="Phone" onChange={(e)=>setForm({...form, phone:e.target.value})}/>
          <input style={input} placeholder="Email" onChange={(e)=>setForm({...form, email:e.target.value})}/>
          <input style={input} placeholder="Password" type="password" onChange={(e)=>setForm({...form, password:e.target.value})}/>
          <input style={input} placeholder="Age" type="number" onChange={(e)=>setForm({...form, age:e.target.value})}/>
        </div>

        <input type="file" onChange={(e)=>setFile(e.target.files[0])}/>
      </div>

      {/* PREFERENCES */}
      <div style={card}>
        <div style={sectionTitle}>Preferences</div>

        <input style={input} placeholder="Division Preference" onChange={(e)=>setForm({...form, division:e.target.value})}/>

        <label style={checkbox}>
          <input type="checkbox" onChange={(e)=>setForm({...form, assistant:e.target.checked})}/>
          Assistant Coach
        </label>
      </div>

      {/* EXPERIENCE */}
      <div style={card}>
        <div style={sectionTitle}>Experience</div>

        <label style={checkbox}>
          <input type="checkbox" onChange={(e)=>setForm({...form, coachedBefore:e.target.checked})}/>
          Coached Before
        </label>

        <textarea
          style={textarea}
          placeholder="Describe your experience..."
          onChange={(e)=>setForm({...form, experience:e.target.value})}
        />
      </div>

      {/* NOTES */}
      <div style={card}>
        <textarea
          style={textarea}
          placeholder="Additional notes"
          onChange={(e)=>setForm({...form, notes:e.target.value})}
        />
      </div>

      <button style={submitBtn} onClick={handleSubmit}>
        {loading ? "Submitting..." : "Register Coach"}
      </button>

    </div>
  );
}

/* ================= STYLES ================= */

const wrap = {
  maxWidth: 500,
  margin: "auto",
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 16
};

const title = {
  fontSize: 24,
  fontWeight: 700
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const sectionTitle = {
  fontWeight: 700,
  marginBottom: 10
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 10
};

const input = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  width: "100%"
};

const textarea = {
  width: "100%",
  minHeight: 90,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  marginTop: 10
};

const checkbox = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 10
};

const submitBtn = {
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600
};

/* CLOSED SCREEN */

const centerWrap = {
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc"
};

const centerCard = {
  width: 340,
  background: "#fff",
  padding: 30,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  textAlign: "center"
};

const subText = {
  fontSize: 13,
  color: "#64748b"
};
