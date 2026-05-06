import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

export default function Divisions() {
  const [divisions, setDivisions] = useState([]);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadDivisions();
  }, []);

  const loadDivisions = async () => {
    const { data, error } = await supabase
      .from("divisions")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Division load error:", error);
      setStatus({ type: "error", message: "Could not load divisions." });
      return;
    }

    setDivisions(data || []);
  };

  const addDivision = async () => {
    const name = newName.trim();
    if (!name) return;

    setStatus(null);

    const { error } = await supabase.from("divisions").insert({ name });

    if (error) {
      console.error("Division add error:", error);
      setStatus({ type: "error", message: "Could not add division. It may already exist." });
      return;
    }

    setNewName("");
    setStatus({ type: "success", message: "Division added." });
    loadDivisions();
  };

  const updateDivision = async (id, name) => {
    setDivisions((prev) => prev.map((division) => (
      division.id === id ? { ...division, name } : division
    )));
  };

  const saveDivision = async (division) => {
    const name = division.name.trim();
    if (!name) return;

    const { error } = await supabase
      .from("divisions")
      .update({ name })
      .eq("id", division.id);

    if (error) {
      console.error("Division save error:", error);
      setStatus({ type: "error", message: "Could not save division." });
      return;
    }

    setStatus({ type: "success", message: "Division saved." });
    loadDivisions();
  };

  const deleteDivision = async (id) => {
    const { error } = await supabase
      .from("divisions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Division delete error:", error);
      setStatus({
        type: "error",
        message: "Could not delete division. It may be used by players or teams.",
      });
      return;
    }

    setStatus({ type: "success", message: "Division deleted." });
    loadDivisions();
  };

  return (
    <div>
      <h2 style={title}>Divisions</h2>
      <div style={subtitle}>
        Manage the division names used for players, teams, matchups, and field assignments.
      </div>

      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      <div style={addRow}>
        <input
          style={input}
          value={newName}
          placeholder="New division name"
          onChange={(event) => setNewName(event.target.value)}
        />
        <button style={addBtn} onClick={addDivision}>Add Division</button>
      </div>

      <div style={grid}>
        {divisions.map((division) => (
          <div key={division.id} style={card}>
            <input
              style={input}
              value={division.name}
              onChange={(event) => updateDivision(division.id, event.target.value)}
            />
            <div style={actionRow}>
              <button style={saveBtn} onClick={() => saveDivision(division)}>Save</button>
              <button style={deleteBtn} onClick={() => deleteDivision(division.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const title = { fontSize: 22, fontWeight: 800, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 13, marginTop: 4 };
const addRow = { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" };
const input = { padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", flex: 1, minWidth: 180 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14, marginTop: 18 };
const card = { background: "#f8fafc", borderRadius: 12, padding: 12 };
const actionRow = { display: "flex", gap: 8, marginTop: 10 };
const addBtn = { padding: "10px 14px", borderRadius: 10, background: "#10b981", color: "#fff", border: "none" };
const saveBtn = { padding: "8px 12px", borderRadius: 8, background: "#2f6ea6", color: "#fff", border: "none" };
const deleteBtn = { padding: "8px 12px", borderRadius: 8, background: "#fee2e2", color: "#991b1b", border: "none" };
const statusBox = { marginTop: 12, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700 };
const successBox = { background: "#dcfce7", color: "#166534" };
const errorBox = { background: "#fee2e2", color: "#991b1b" };
