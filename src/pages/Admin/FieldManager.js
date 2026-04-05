import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function FieldManager() {
  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState(null);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    const { data, error } = await supabase
      .from("fields")
      .select("*")
      .order("field_number", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setFields(data || []);
  };

  /* ================= UPDATE FIELD ================= */

  const updateField = async (updates) => {
    await supabase
      .from("fields")
      .update(updates)
      .eq("id", activeField.id);

    setActiveField(null);
    loadFields();
  };

  /* ================= TYPE LABEL ================= */

  const getTypeLabel = (type) => {
    if (type === "game") return "Game Field";
    if (type === "practice") return "Practice Field";
    if (type === "k-1") return "K-1 Field";
    return type;
  };

  /* ================= MAIN ================= */

  if (activeField) {
    return (
      <div>

        <button style={backBtn} onClick={() => setActiveField(null)}>
          ← Back
        </button>

        <h1>{activeField.name}</h1>

        <div style={editorCard}>

          <h3>Field Type</h3>

          <select
            style={dropdown}
            value={activeField.type}
            onChange={(e) =>
              setActiveField({ ...activeField, type: e.target.value })
            }
          >
            <option value="game">Game Field</option>
            <option value="practice">Practice Field</option>
            <option value="k-1">K-1 Field</option>
          </select>

          <div style={{ marginTop: 20 }}>
            <button
              style={saveBtn}
              onClick={() =>
                updateField({ type: activeField.type })
              }
            >
              Save Changes
            </button>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div>

      <h1>Field Manager</h1>
      <p style={{ color: "#64748b" }}>
        Manage field types and assignments
      </p>

      {/* ================= FIELD TILES ================= */}
      <div style={grid}>
        {fields.map(field => (
          <div
            key={field.id}
            style={tile}
            onClick={() => setActiveField(field)}
          >
            <div style={fieldName}>{field.name}</div>

            <div style={fieldType}>
              {getTypeLabel(field.type)}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 20,
  marginTop: 20
};

const tile = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 20,
  textAlign: "center",
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
};

const fieldName = {
  fontSize: 18,
  fontWeight: "700"
};

const fieldType = {
  marginTop: 8,
  fontSize: 13,
  color: "#64748b"
};

const editorCard = {
  marginTop: 20,
  background: "#ffffff",
  padding: 20,
  borderRadius: 14,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  maxWidth: 400
};

const dropdown = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  width: "100%",
  marginTop: 10
};

const saveBtn = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  cursor: "pointer"
};

const backBtn = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  marginBottom: 10
};
