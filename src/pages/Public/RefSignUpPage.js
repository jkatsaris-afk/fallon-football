import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefSignUpPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

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
      .single();

    setSettings(data);
  };

  /* ================= IMAGE PICK ================= */

  const handleFileChange = (e) => {
    const selected = e.target.files[0];

    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    setLoading(true);

    try {
      let fileName = null;

      // 🔥 UPLOAD IMAGE
      if (file) {
        fileName = `${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;
      }

      // 🔥 CREATE USER
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: form.email,
          password: form.password
        });

      if (authError) throw authError;

      const user = authData.user;

      // 🔥 INSERT REF
      const { error: insertError } = await supabase
        .from("referees")
        .insert([
          {
            auth_id: user.id,
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            email: form.email,
            age: Number(form.age),
            experience: form.experience,
            availability: form.availability,
            notes: form.notes,
            profile_image: fileName
          }
        ]);

      if (insertError) throw insertError;

      alert("Account Created!");

    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong");
    }

    setLoading(false);
  };

  if (!settings) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={container}>

      <h2 style={{ marginBottom: 20 }}>Referee Registration</h2>

      {!settings.ref_signups_open && (
        <Card center>
          <h3>Registration Closed</h3>
        </Card>
      )}

      {settings.ref_signups_open && (
        <>
          {/* PROFILE IMAGE */}
          <Card>
            <div style={center}>
              <div style={imageWrap}>
                <img
                  src={preview || "/default-profile.png"}
                  alt="preview"
                  style={profileImg}
                />
              </div>

              <label style={uploadBtn}>
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  hidden
                />
              </label>
            </div>
          </Card>

          {/* BASIC INFO */}
          <Card>
            <Input placeholder="First Name" required onChange={(v)=>setForm({...form, firstName:v})}/>
            <Input placeholder="Last Name" required onChange={(v)=>setForm({...form, lastName:v})}/>
            <Input placeholder="Phone" required onChange={(v)=>setForm({...form, phone:v})}/>
            <Input placeholder="Email" required onChange={(v)=>setForm({...form, email:v})}/>
            <Input placeholder="Password" type="password" required onChange={(v)=>setForm({...form, password:v})}/>
            <Input placeholder="Age" type="number" required onChange={(v)=>setForm({...form, age:v})}/>
          </Card>

          {/* EXPERIENCE */}
          <Card>
            <textarea
              placeholder="Experience"
              onChange={(e)=>setForm({...form, experience:e.target.value})}
              style={textarea}
            />
          </Card>

          {/* AVAILABILITY */}
          <Card>
            <textarea
              placeholder="Availability"
              onChange={(e)=>setForm({...form, availability:e.target.value})}
              style={textarea}
            />
          </Card>

          {/* NOTES */}
          <Card>
            <textarea
              placeholder="Notes"
              onChange={(e)=>setForm({...form, notes:e.target.value})}
              style={textarea}
            />
          </Card>

          <button onClick={handleSubmit} style={submitBtn}>
            {loading ? "Creating..." : "Create Account"}
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
      boxShadow: "0 6px 20px rgba(0,0,0,0.05)"
    }}>
      {children}
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

const center = {
  textAlign: "center"
};

const imageWrap = {
  marginBottom: 10
};

const profileImg = {
  width: 100,
  height: 100,
  borderRadius: "50%",
  objectFit: "cover"
};

const uploadBtn = {
  background: "#16a34a",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  display: "inline-block"
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  marginBottom: 10,
  fontSize: 16
};

const textarea = {
  width: "100%",
  minHeight: 80,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  fontSize: 16,
  boxSizing: "border-box"
};

const submitBtn = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600
};
