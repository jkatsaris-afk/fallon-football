import React, { useState } from "react";
import { supabase } from "../../supabase";

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    experience: "beginner",
    shirtSize: "YM",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    emergencySame: true,
    emergencyName: "",
    emergencyPhone: "",
    emergencyEmail: "",
    waiver: false
  });

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

    // ===== PLAYER =====
    const { data: player, error } = await supabase
      .from("players")
      .insert([
        {
          first_name: form.firstName,
          last_name: form.lastName,
          age: Number(form.age),
          experience_level: form.experience,
          division,
          shirt_size: form.shirtSize,
          season_id: 2026,
          waiver_signed: true
        }
      ])
      .select()
      .single();

    if (error) {
      alert("Error saving player");
      setLoading(false);
      return;
    }

    // ===== PRIMARY GUARDIAN =====
    const { data: parent } = await supabase
      .from("guardians")
      .insert([
        {
          name: form.parentName,
          phone: form.parentPhone,
          email: form.parentEmail,
          is_primary: true
        }
      ])
      .select()
      .single();

    await supabase.from("player_guardians").insert([
      {
        player_id: player.id,
        guardian_id: parent.id,
        is_emergency_contact: form.emergencySame
      }
    ]);

    // ===== SECOND EMERGENCY =====
    if (!form.emergencySame) {
      const { data: emergency } = await supabase
        .from("guardians")
        .insert([
          {
            name: form.emergencyName,
            phone: form.emergencyPhone,
            email: form.emergencyEmail
          }
        ])
        .select()
        .single();

      await supabase.from("player_guardians").insert([
        {
          player_id: player.id,
          guardian_id: emergency.id,
          is_emergency_contact: true
        }
      ]);
    }

    alert("✅ Player Registered!");

    setForm({
      firstName: "",
      lastName: "",
      age: "",
      experience: "beginner",
      shirtSize: "YM",
      parentName: "",
      parentPhone: "",
      parentEmail: "",
      emergencySame: true,
      emergencyName: "",
      emergencyPhone: "",
      emergencyEmail: "",
      waiver: false
    });

    setLoading(false);
  };

  const input = {
    width: "100%",
    padding: 14,
    marginBottom: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    fontSize: 16
  };

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h2>🏈 Fallon Flag Football</h2>
      <h3>Player Registration</h3>

      <input style={input} placeholder="Child First Name"
        value={form.firstName}
        onChange={(e) => setForm({ ...form, firstName: e.target.value })} />

      <input style={input} placeholder="Child Last Name"
        value={form.lastName}
        onChange={(e) => setForm({ ...form, lastName: e.target.value })} />

      <input style={input} type="number" placeholder="Age"
        value={form.age}
        onChange={(e) => setForm({ ...form, age: e.target.value })} />

      <select style={input}
        value={form.experience}
        onChange={(e) => setForm({ ...form, experience: e.target.value })}>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="experienced">Experienced</option>
      </select>

      <select style={input}
        value={form.shirtSize}
        onChange={(e) => setForm({ ...form, shirtSize: e.target.value })}>
        <option>YS</option>
        <option>YM</option>
        <option>YL</option>
        <option>YXL</option>
        <option>AS</option>
        <option>AM</option>
        <option>AL</option>
      </select>

      <h3>Parent Info</h3>

      <input style={input} placeholder="Parent Name"
        value={form.parentName}
        onChange={(e) => setForm({ ...form, parentName: e.target.value })} />

      <input style={input} placeholder="Phone"
        value={form.parentPhone}
        onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />

      <input style={input} placeholder="Email"
        value={form.parentEmail}
        onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />

      <label style={{ display: "block", marginBottom: 10 }}>
        <input type="checkbox"
          checked={form.emergencySame}
          onChange={(e) => setForm({ ...form, emergencySame: e.target.checked })} />
        Use parent as emergency contact
      </label>

      {!form.emergencySame && (
        <>
          <h3>Emergency Contact</h3>

          <input style={input} placeholder="Name"
            onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />

          <input style={input} placeholder="Phone"
            onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />

          <input style={input} placeholder="Email"
            onChange={(e) => setForm({ ...form, emergencyEmail: e.target.value })} />
        </>
      )}

      <label style={{ display: "block", marginBottom: 20 }}>
        <input type="checkbox"
          checked={form.waiver}
          onChange={(e) => setForm({ ...form, waiver: e.target.checked })} />
        I agree to the waiver
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          padding: 16,
          background: "#2f6ea6",
          color: "white",
          border: "none",
          borderRadius: 14,
          fontSize: 18
        }}
      >
        {loading ? "Submitting..." : "Register Player"}
      </button>
    </div>
  );
}
