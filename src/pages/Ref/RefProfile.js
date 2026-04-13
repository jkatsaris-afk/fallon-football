import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function RefProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ref, setRef] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return;

    const { data, error } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    setRef(data);
    setLoading(false);
  };

  const updateField = (field, value) => {
    setRef(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveProfile = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("referees")
      .update({
        first_name: ref.first_name,
        last_name: ref.last_name,
        phone: ref.phone,
        age: ref.age,
        experience: ref.experience,
        availability: ref.availability,
        notes: ref.notes
      })
      .eq("id", ref.id);

    if (error) {
      console.error(error);
      alert("Failed to save");
    } else {
      alert("Profile updated!");
    }

    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  if (!ref) {
    return <div style={{ padding: 20 }}>No profile found</div>;
  }

  return (
    <div style={container}>

      <h2 style={{ marginBottom: 15 }}>My Profile</h2>

      <div style={card}>

        <Section title="Basic Info">
          <Input label="First Name" value={ref.first_name} onChange={(v) => updateField("first_name", v)} />
          <Input label="Last Name" value={ref.last_name} onChange={(v) => updateField("last_name", v)} />
          <Input label="Email" value={ref.email} disabled />
          <Input label="Phone" value={ref.phone} onChange={(v) => updateField("phone", v)} />
          <Input label="Age" value={ref.age || ""} onChange={(v) => updateField("age", v)} />
        </Section>

      </div>

      <div style={card}>
        <Section title="Experience">
          <textarea
            value={ref.experience || ""}
            onChange={(e) => updateField("experience", e.target.value)}
            style={textarea}
          />
        </Section>
      </div>

      <div style={card}>
        <Section title="Availability">
          <textarea
            value={ref.availability || ""}
            onChange={(e) => updateField("availability", e.target.value)}
            style={textarea}
          />
        </Section>
      </div>

      <div style={card}>
        <Section title="Notes">
          <textarea
            value={ref.notes || ""}
            onChange={(e) => updateField("notes", e.target.value)}
            style={textarea}
          />
        </Section>
      </div>

      <button onClick={saveProfile} style={saveBtn}>
        {saving ? "Saving..." : "Save Profile"}
      </button>

    </div>
  );
}

/* 🔥 COMPONENTS */

function Section({ title, children }) {
  return (
    <div>
      <div style={sectionTitle}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, disabled }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={input}
      />
    </div>
  );
}

/* 🔥 STYLES */

const container = {
  padding: 20,
  maxWidth: 500,
  margin: "auto"
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: 20,
  marginBottom: 15,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)"
};

const sectionTitle = {
  fontWeight: 600,
  marginBottom: 10
};

const labelStyle = {
  fontSize: 12,
  color: "#64748b",
  marginBottom: 4
};

const input = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box"
};

const textarea = {
  width: "100%",
  minHeight: 90,
  padding: 12,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxSizing: "border-box"
};

const saveBtn = {
  width: "100%",
  padding: 16,
  borderRadius: 14,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600,
  marginTop: 10,
  cursor: "pointer"
};
