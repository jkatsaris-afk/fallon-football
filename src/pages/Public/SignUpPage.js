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

  // ================= LOAD SETTINGS =================
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Settings load error:", error);
    } else {
      setSettings(data);
    }
  };

  // ================= DIVISION =================
  const getDivision = (age) => {
    if (age <= 5) return "K-1";
    if (age <= 7) return "2nd-3rd";
    if (age <= 9) return "4th-5th";
    return "6th+";
  };

  // ================= SUBMIT =================
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
      console.error(error);
      setLoading(false);
      return;
    }

    alert("✅ Registered! Payment will be sent separately.");

    setForm({
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

    setLoading(false);
  };

  // ================= LOADING STATE =================
  if (!settings) {
    return (
      <div style={{ padding: 20 }}>
        Loading registration...
      </div>
    );
  }

  // ================= MAIN RENDER =================
  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>

      {/* 🔒 CLOSED STATE */}
      {!settings.signups_open && (
        <div style={{ textAlign: "center", marginTop: 80 }}>
          <h2>🚫 Registration Closed</h2>
          <p>Signups are currently closed for this season.</p>
          <p>Please check back later.</p>
        </div>
      )}

      {/* ✅ OPEN STATE */}
      {settings.signups_open && (
        <>
          <h2>🏈 Player Registration</h2>

          <input
            placeholder="First Name"
            value={form.firstName}
            onChange={(e) =>
              setForm({ ...form, firstName: e.target.value })
            }
          />

          <input
            placeholder="Last Name"
            value={form.lastName}
            onChange={(e) =>
              setForm({ ...form, lastName: e.target.value })
            }
          />

          <input
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={(e) =>
              setForm({ ...form, age: e.target.value })
            }
          />

          <select
            value={form.experience}
            onChange={(e) =>
              setForm({ ...form, experience: e.target.value })
            }
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="experienced">Experienced</option>
          </select>

          <select
            value={form.shirtSize}
            onChange={(e) =>
              setForm({ ...form, shirtSize: e.target.value })
            }
          >
            <option>YS</option>
            <option>YM</option>
            <option>YL</option>
            <option>YXL</option>
            <option>AS</option>
            <option>AM</option>
            <option>AL</option>
          </select>

          <h3>Parent Info</h3>

          <input
            placeholder="Parent Name"
            value={form.parentName}
            onChange={(e) =>
              setForm({ ...form, parentName: e.target.value })
            }
          />

          <input
            placeholder="Phone"
            value={form.parentPhone}
            onChange={(e) =>
              setForm({ ...form, parentPhone: e.target.value })
            }
          />

          <input
            placeholder="Email"
            value={form.parentEmail}
            onChange={(e) =>
              setForm({ ...form, parentEmail: e.target.value })
            }
          />

          <label style={{ display: "block", marginTop: 10 }}>
            <input
              type="checkbox"
              checked={form.waiver}
              onChange={(e) =>
                setForm({ ...form, waiver: e.target.checked })
              }
            />
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
