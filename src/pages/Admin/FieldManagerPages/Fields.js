import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

const PHASES = {
  regular: "regular",
  championship: "championship",
};

export default function Fields() {
  const [fields, setFields] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadFields();
    loadDivisions();
  }, []);

  const loadFields = async () => {
    const { data, error } = await supabase
      .from("fields")
      .select("*")
      .order("field_number", { ascending: true });

    if (error) {
      console.error("Field load error:", error);
      setStatus({
        type: "error",
        message: `Could not load fields: ${error.message}`,
      });
      return;
    }

    setFields(data || []);
  };

  const loadDivisions = async () => {
    const { data: divisionData } = await supabase
      .from("divisions")
      .select("name")
      .order("name", { ascending: true });

    const { data: teamData } = await supabase
      .from("teams")
      .select("division");

    const names = [
      ...(divisionData || []).map((division) => division.name),
      ...(teamData || []).map((team) => team.division),
    ].filter(Boolean);

    setDivisions([...new Set(names)].sort((a, b) => {
      if (a === "K-1") return -1;
      if (b === "K-1") return 1;
      return a.localeCompare(b);
    }));
  };

  const getPhase = (field) => field.season_phase || PHASES.regular;

  const regularFields = fields.filter((field) => getPhase(field) === PHASES.regular);
  const championshipFields = fields.filter((field) => getPhase(field) === PHASES.championship);

  const saveField = async () => {
    setStatus(null);

    const { error } = await supabase
      .from("fields")
      .update({
        name: activeField.name,
        field_number: activeField.field_number || null,
        type: activeField.type,
        division: activeField.division || null,
        is_active: activeField.is_active,
        season_phase: getPhase(activeField),
      })
      .eq("id", activeField.id);

    if (error) {
      console.error("Field save error:", error);
      setStatus({ type: "error", message: `Field could not be saved: ${error.message}` });
      return;
    }

    setStatus({ type: "success", message: "Field saved." });
    setActiveField(null);
    loadFields();
  };

  const addField = async (phase) => {
    setStatus(null);

    const { error } = await supabase.from("fields").insert({
      name: phase === PHASES.championship ? "New Championship Field" : "New Regular Season Field",
      field_number: fields.length + 1,
      type: "game",
      division: null,
      season_phase: phase,
      is_active: true,
    });

    if (error) {
      console.error("Field add error:", error);
      setStatus({
        type: "error",
        message: `Field could not be added: ${error.message}`,
      });
      return;
    }

    setStatus({ type: "success", message: "Field added." });
    loadFields();
  };

  const deleteField = async (fieldId) => {
    setStatus(null);

    const { error } = await supabase
      .from("fields")
      .delete()
      .eq("id", fieldId);

    if (error) {
      console.error("Field delete error:", error);
      setStatus({
        type: "error",
        message: `Field could not be deleted: ${error.message}`,
      });
      return;
    }

    setStatus({ type: "success", message: "Field deleted." });
    setActiveField(null);
    loadFields();
  };

  const copyRegularToChampionship = async () => {
    setStatus(null);

    if (!regularFields.length) {
      setStatus({ type: "error", message: "Add regular season fields before copying." });
      return;
    }

    const { error: deleteError } = await supabase
      .from("fields")
      .delete()
      .eq("season_phase", PHASES.championship);

    if (deleteError) {
      console.error("Championship field clear error:", deleteError);
      setStatus({ type: "error", message: `Could not reset championship fields: ${deleteError.message}` });
      return;
    }

    const copies = regularFields.map((field) => ({
      name: field.name,
      field_number: field.field_number,
      type: field.type,
      division: field.division || null,
      is_active: field.is_active,
      season_phase: PHASES.championship,
    }));

    const { error } = await supabase.from("fields").insert(copies);

    if (error) {
      console.error("Championship field copy error:", error);
      setStatus({ type: "error", message: `Could not copy regular season fields: ${error.message}` });
      return;
    }

    setStatus({ type: "success", message: "Championship fields now match regular season fields." });
    loadFields();
  };

  if (activeField) {
    return (
      <div>
        <button style={backBtn} onClick={() => setActiveField(null)}>
          Back
        </button>

        <h2 style={title}>{activeField.name}</h2>

        <div style={card}>
          <div style={grid}>
            <div style={tile}>
              <div style={label}>Field Name</div>
              <input
                style={input}
                value={activeField.name}
                onChange={(event) => setActiveField({ ...activeField, name: event.target.value })}
              />
            </div>

            <div style={tile}>
              <div style={label}>Field Number</div>
              <input
                style={input}
                type="number"
                value={activeField.field_number || ""}
                onChange={(event) => setActiveField({ ...activeField, field_number: Number(event.target.value) })}
              />
            </div>

            <div style={tile}>
              <div style={label}>Field Type</div>
              <select
                style={input}
                value={activeField.type}
                onChange={(event) => setActiveField({ ...activeField, type: event.target.value })}
              >
                <option value="game">Game</option>
                <option value="practice">Practice</option>
              </select>
            </div>

            <div style={tile}>
              <div style={label}>Division Assignment</div>
              <select
                style={input}
                value={activeField.division || ""}
                onChange={(event) => setActiveField({ ...activeField, division: event.target.value || null })}
              >
                <option value="">All Divisions</option>
                {divisions.map((division) => (
                  <option key={division} value={division}>{division}</option>
                ))}
              </select>
            </div>

            <div style={tile}>
              <div style={label}>Season Section</div>
              <select
                style={input}
                value={getPhase(activeField)}
                onChange={(event) => setActiveField({ ...activeField, season_phase: event.target.value })}
              >
                <option value={PHASES.regular}>Regular Season</option>
                <option value={PHASES.championship}>Championship</option>
              </select>
            </div>
          </div>

          <div style={actionRow}>
            <button style={saveBtn} onClick={saveField}>Save Field</button>
            <button style={deleteBtn} onClick={() => deleteField(activeField.id)}>Delete Field</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={headerRow}>
        <h2 style={title}>Field Assignments</h2>
      </div>

      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      <FieldSection
        title="Regular Season Fields"
        description="Fields used for regular season auto-generated schedules."
        fields={regularFields}
        onAdd={() => addField(PHASES.regular)}
        onOpen={setActiveField}
      />

      <FieldSection
        title="Championship Fields"
        description="Use these when championship games need different field assignments."
        fields={championshipFields}
        onAdd={() => addField(PHASES.championship)}
        onOpen={setActiveField}
        action={
          <button style={secondaryBtn} onClick={copyRegularToChampionship}>
            Match Regular Season Fields
          </button>
        }
      />
    </div>
  );
}

function FieldSection({ title, description, fields, onAdd, onOpen, action }) {
  return (
    <section style={sectionBlock}>
      <div style={sectionHeader}>
        <div>
          <h3 style={sectionTitle}>{title}</h3>
          <div style={sectionDesc}>{description}</div>
        </div>
        <div style={sectionActions}>
          {action}
          <button style={addBtn} onClick={onAdd}>+ Add Field</button>
        </div>
      </div>

      <div style={grid}>
        {fields.map((field) => (
          <div key={field.id} style={cardTile} onClick={() => onOpen(field)}>
            <div style={fieldName}>{field.name}</div>
            <div style={sub}>Field {field.field_number || "-"}</div>
            <div style={sub}>{field.type}</div>
            <div style={sub}>{field.division || "All Divisions"}</div>
          </div>
        ))}
      </div>

      {fields.length === 0 && (
        <div style={empty}>No fields in this section yet.</div>
      )}
    </section>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
  gap: 16,
  marginTop: 16,
};

const sectionBlock = {
  borderTop: "1px solid #e2e8f0",
  marginTop: 22,
  paddingTop: 18,
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const sectionActions = { display: "flex", gap: 10, flexWrap: "wrap" };
const sectionTitle = { margin: 0, fontSize: 18, fontWeight: 800 };
const sectionDesc = { color: "#64748b", fontSize: 13, marginTop: 3 };

const cardTile = {
  background: "#fff",
  padding: 18,
  borderRadius: 16,
  boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  cursor: "pointer",
};

const fieldName = { fontWeight: 700 };
const sub = { fontSize: 13, color: "#64748b" };

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const title = { fontSize: 22, fontWeight: 700 };

const card = {
  marginTop: 16,
  background: "#fff",
  padding: 20,
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

const tile = {
  background: "#f8fafc",
  padding: 12,
  borderRadius: 12,
};

const label = { fontWeight: 600, marginBottom: 6 };

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  boxSizing: "border-box",
};

const actionRow = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 };

const saveBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#2f6ea6",
  color: "#fff",
  border: "none",
};

const addBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#10b981",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#fff",
  color: "#334155",
  border: "1px solid #cbd5e1",
  cursor: "pointer",
};

const deleteBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  border: "none",
  cursor: "pointer",
};

const backBtn = {
  marginBottom: 10,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
};

const empty = {
  color: "#64748b",
  padding: 16,
  textAlign: "center",
};

const statusBox = {
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
};

const successBox = { background: "#dcfce7", color: "#166534" };
const errorBox = { background: "#fee2e2", color: "#991b1b" };
