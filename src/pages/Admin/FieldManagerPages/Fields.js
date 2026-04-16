import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function Fields() {
  const [fields, setFields] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    const { data } = await supabase
      .from("fields")
      .select("*")
      .order("field_number");

    setFields(data || []);
  };

  const loadTimeSlots = async (type) => {
    const { data } = await supabase
      .from("field_time_slots")
      .select("*")
      .eq("field_type", type)
      .order("sort_order");

    setTimeSlots(data || []);
  };

  const saveField = async () => {
    await supabase
      .from("fields")
      .update({
        name: activeField.name,
        type: activeField.type,
        division: activeField.division
      })
      .eq("id", activeField.id);

    loadFields();
  };

  const addField = async () => {
    await supabase.from("fields").insert({
      name: "New Field",
      type: "game",
      division: ""
    });

    loadFields();
  };

  if (activeField) {
    return (
      <div>

        <button style={backBtn} onClick={() => setActiveField(null)}>
          ← Back
        </button>

        <h2 style={title}>{activeField.name}</h2>

        <div style={card}>

          <div style={grid}>

            {/* NAME */}
            <div style={tile}>
              <div style={label}>Field Name</div>
              <input
                style={input}
                value={activeField.name}
                onChange={(e) =>
                  setActiveField({ ...activeField, name: e.target.value })
                }
              />
            </div>

            {/* TYPE */}
            <div style={tile}>
              <div style={label}>Field Type</div>
              <select
                style={input}
                value={activeField.type}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveField({ ...activeField, type: val });
                  loadTimeSlots(val);
                }}
              >
                <option value="game">Game</option>
                <option value="practice">Practice</option>
                <option value="k-1">K-1</option>
              </select>
            </div>

            {/* DIVISION */}
            <div style={tile}>
              <div style={label}>Division</div>
              <select
                style={input}
                value={activeField.division || ""}
                onChange={(e) =>
                  setActiveField({ ...activeField, division: e.target.value })
                }
              >
                <option value="">None</option>
                <option value="k-1">K-1</option>
                <option value="2nd-3rd">2nd-3rd</option>
                <option value="4th-5th">4th-5th</option>
                <option value="6th-8th">6th-8th</option>
              </select>
            </div>

          </div>

          <button style={saveBtn} onClick={saveField}>
            Save Field
          </button>

          {/* TIME SLOTS */}
          <div style={{ marginTop: 20 }}>
            <div style={label}>Time Slots</div>

            {timeSlots.map(slot => (
              <input
                key={slot.id}
                style={timeInput}
                value={slot.time}
                onChange={(e) => {
                  const val = e.target.value;
                  setTimeSlots(prev =>
                    prev.map(s =>
                      s.id === slot.id ? { ...s, time: val } : s
                    )
                  );
                }}
              />
            ))}

            <button style={addBtn}>+ Add Time</button>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div>

      <div style={headerRow}>
        <h2 style={title}>Fields</h2>
        <button style={addBtn} onClick={addField}>
          + Add Field
        </button>
      </div>

      <div style={grid}>
        {fields.map(field => (
          <div
            key={field.id}
            style={cardTile}
            onClick={() => {
              setActiveField(field);
              loadTimeSlots(field.type);
            }}
          >
            <div style={fieldName}>{field.name}</div>
            <div style={sub}>{field.type}</div>
            <div style={sub}>{field.division || "No Division"}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* 🔥 STYLES (MATCH REF MANAGER) */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
  gap: 16,
  marginTop: 16
};

const cardTile = {
  background: "#fff",
  padding: 18,
  borderRadius: 16,
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  cursor: "pointer"
};

const fieldName = { fontWeight: 700 };
const sub = { fontSize: 13, color: "#64748b" };

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const title = { fontSize: 22, fontWeight: 700 };

const card = {
  marginTop: 16,
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const tile = {
  background: "#f8fafc",
  padding: 12,
  borderRadius: 12
};

const label = { fontWeight: 600, marginBottom: 6 };

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e5e7eb"
};

const timeInput = {
  width: "100%",
  marginTop: 8,
  padding: 8,
  borderRadius: 6,
  border: "1px solid #e5e7eb"
};

const saveBtn = {
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 10,
  background: "#2f6ea6",
  color: "#fff",
  border: "none"
};

const addBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#10b981",
  color: "#fff",
  border: "none",
  cursor: "pointer"
};

const backBtn = {
  marginBottom: 10,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb"
};
