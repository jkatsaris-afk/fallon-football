import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function FieldManager() {
  const [fields, setFields] = useState([]);
  const [newField, setNewField] = useState("");

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    const { data, error } = await supabase
      .from("fields")
      .select("*")
      .order("name");

    if (!error) setFields(data);
  };

  const addField = async () => {
    if (!newField.trim()) return;

    await supabase.from("fields").insert([{ name: newField }]);

    setNewField("");
    loadFields();
  };

  const deleteField = async (id) => {
    await supabase.from("fields").delete().eq("id", id);
    loadFields();
  };

  return (
    <div>
      <h1>Field Manager</h1>
      <p style={{ color: "#64748b" }}>
        Manage all playable fields for scheduling
      </p>

      {/* ADD FIELD */}
      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <input
          value={newField}
          onChange={(e) => setNewField(e.target.value)}
          placeholder="Field Name (ex: Field 1)"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            width: 250
          }}
        />

        <button
          onClick={addField}
          style={{
            padding: "10px 15px",
            borderRadius: 8,
            border: "none",
            background: "#2f6ea6",
            color: "#fff",
            cursor: "pointer"
          }}
        >
          Add Field
        </button>
      </div>

      {/* FIELD LIST */}
      <div style={{ marginTop: 30 }}>
        {fields.map((field) => (
          <div
            key={field.id}
            style={{
              background: "#fff",
              padding: 15,
              borderRadius: 10,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
            }}
          >
            <div>{field.name}</div>

            <button
              onClick={() => deleteField(field.id)}
              style={{
                background: "#ef4444",
                border: "none",
                color: "#fff",
                padding: "6px 10px",
                borderRadius: 6,
                cursor: "pointer"
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
