import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function FieldManager() {
  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    const { data, error } = await supabase
      .from("fields")
      .select("*")
      .order("field_number", { ascending: true });

    if (error) console.error(error);
    setFields(data || []);
  };

  /* ================= LOAD TIME SLOTS ================= */

  const loadTimeSlots = async (type) => {
    const { data, error } = await supabase
      .from("field_time_slots")
      .select("*")
      .eq("field_type", type)
      .order("sort_order");

    if (error) console.error(error);
    setTimeSlots(data || []);
  };

  /* ================= UPDATE FIELD ================= */

  const updateField = async () => {
    await supabase
      .from("fields")
      .update({ type: activeField.type })
      .eq("id", activeField.id);

    setActiveField(null);
    loadFields();
  };

  /* ================= SAVE TIME SLOT EDIT ================= */

  const saveTimeSlot = async (slot) => {
    await supabase
      .from("field_time_slots")
      .update({ time: slot.time })
      .eq("id", slot.id);
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

          {/* FIELD TYPE */}
          <h3>Field Type</h3>

          <select
            style={dropdown}
            value={activeField.type}
            onChange={(e) => {
              setActiveField({ ...activeField, type: e.target.value });
              loadTimeSlots(e.target.value);
            }}
          >
            <option value="game">Game Field</option>
            <option value="practice">Practice Field</option>
            <option value="k-1">K-1 Field</option>
          </select>

          <button style={saveBtn} onClick={updateField}>
            Save Field Type
          </button>

          {/* TIME SLOTS */}
          <h3 style={{ marginTop: 25 }}>Time Slots</h3>

          {timeSlots.map(slot => (
            <div key={slot.id} style={timeRow}>

              <input
                value={slot.time}
                style={timeInput}
                onChange={(e) =>
                  setTimeSlots(prev =>
                    prev.map(s =>
                      s.id === slot.id ? { ...s, time: e.target.value } : s
                    )
                  )
                }
                onBlur={() => saveTimeSlot(slot)}
              />

              <button
                style={deleteBtn}
                onClick={async () => {
                  await supabase
                    .from("field_time_slots")
                    .delete()
                    .eq("id", slot.id);

                  loadTimeSlots(activeField.type);
                }}
              >
                X
              </button>

            </div>
          ))}

          <button
            style={addBtn}
            onClick={async () => {
              await supabase.from("field_time_slots").insert({
                field_type: activeField.type,
                time: "New Time",
                sort_order: timeSlots.length + 1
              });

              loadTimeSlots(activeField.type);
            }}
          >
            + Add Time
          </button>

        </div>

      </div>
    );
  }

  return (
    <div>

      <h1>Field Manager</h1>
      <p style={{ color: "#64748b" }}>
        Manage fields and time slots
      </p>

      {/* FIELD TILES */}
      <div style={grid}>
        {fields.map(field => (
          <div
            key={field.id}
            style={tile}
            onClick={() => {
              setActiveField(field);
              loadTimeSlots(field.type);
            }}
          >
            <div style={fieldName}>{field.name}</div>

            <div style={fieldType}>
              {field.type.toUpperCase()}
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
  maxWidth: 500
};

const dropdown = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  width: "100%",
  marginTop: 10
};

const saveBtn = {
  marginTop: 10,
  padding: "10px 14px",
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

/* TIME SLOT STYLES */

const timeRow = {
  display: "flex",
  gap: 10,
  marginBottom: 10
};

const timeInput = {
  flex: 1,
  padding: 8,
  borderRadius: 6,
  border: "1px solid #e5e7eb"
};

const deleteBtn = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer"
};

const addBtn = {
  marginTop: 10,
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#10b981",
  color: "#fff",
  cursor: "pointer"
};
