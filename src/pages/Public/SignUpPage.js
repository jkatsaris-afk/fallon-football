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

    const { error } = await supabase.from("players").insert([
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

    if (error) {
      alert("Error saving player");
      setLoading(false);
      return;
    }

    alert("✅ Registered! Payment will be sent separately.");
    setLoading(false);
  };

  if (!settings) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      
      {/* 🔒 CLOSED MESSAGE */}
      {!settings.signups_open && (
        <div
          style={{
            textAlign: "center",
            marginTop: 80
          }}
        >
          <h2>🚫 Registration Closed</h2>
          <p>
            Signups are currently closed for this season.
          </p>
          <p>
            Please check back later or contact the league for more information.
          </p>
        </div>
      )}

      {/* ✅ FORM (ONLY WHEN OPEN) */}
      {settings.signups_open && (
        <>
          <h2>🏈 Registration</h2>

          <input placeholder="First Name"
            onChange={(e)=>setForm({...form, firstName:e.target.value})} />

          <input placeholder="Last Name"
            onChange={(e)=>setForm({...form, lastName:e.target.value})} />

          <input placeholder="Age" type="number"
            onChange={(e)=>setForm({...form, age:e.target.value})} />

          <select
            onChange={(e)=>setForm({...form, experience:e.target.value})}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="experienced">Experienced</option>
          </select>

          <select
            onChange={(e)=>setForm({...form, shirtSize:e.target.value})}>
            <option>YS</option>
            <option>YM</option>
            <option>YL</option>
            <option>AS</option>
            <option>AM</option>
            <option>AL</option>
          </select>

          <h3>Parent</h3>

          <input placeholder="Name"
            onChange={(e)=>setForm({...form, parentName:e.target.value})} />

          <input placeholder="Phone"
            onChange={(e)=>setForm({...form, parentPhone:e.target.value})} />

          <input placeholder="Email"
            onChange={(e)=>setForm({...form, parentEmail:e.target.value})} />

          <label>
            <input type="checkbox"
              onChange={(e)=>setForm({...form, waiver:e.target.checked})} />
            Agree to waiver
          </label>

          <button onClick={handleSubmit} disabled={loading}>
            {loading
              ? "Submitting..."
              : `Register ($${settings.registration_fee})`}
          </button>
        </>
      )}
    </div>
  );
}
