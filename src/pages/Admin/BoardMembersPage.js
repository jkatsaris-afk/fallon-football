import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const blankForm = {
  name: "",
  role: "",
  email: "",
  phone: "",
  display_order: 0,
  is_active: true,
};

export default function BoardMembersPage() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("board_members")
      .select("*")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    setLoading(false);

    if (error) {
      console.error("Board members load failed:", error);
      setStatus("Board members are not set up yet. Run the board_members SQL, then refresh this page.");
      setMembers([]);
      return;
    }

    setStatus("");
    setMembers(data || []);
  };

  const saveMember = async () => {
    setStatus("");
    if (!form.name.trim()) {
      setStatus("Add the board member name before saving.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      email: form.email.trim(),
      phone: cleanPhone(form.phone),
      display_order: Number(form.display_order || 0),
      is_active: Boolean(form.is_active),
    };

    const request = editingId
      ? supabase.from("board_members").update(payload).eq("id", editingId)
      : supabase.from("board_members").insert([payload]);

    const { error } = await request;
    if (error) {
      console.error("Board member save failed:", error);
      setStatus(`Board member could not be saved: ${error.message}`);
      return;
    }

    setForm(blankForm);
    setEditingId(null);
    setStatus(editingId ? "Board member updated." : "Board member added.");
    loadMembers();
  };

  const editMember = (member) => {
    setEditingId(member.id);
    setForm({
      name: member.name || "",
      role: member.role || "",
      email: member.email || "",
      phone: member.phone || "",
      display_order: member.display_order || 0,
      is_active: member.is_active !== false,
    });
    setStatus("");
  };

  const deleteMember = async (id) => {
    const { error } = await supabase.from("board_members").delete().eq("id", id);
    if (error) {
      console.error("Board member delete failed:", error);
      setStatus(`Board member could not be deleted: ${error.message}`);
      return;
    }

    setStatus("Board member deleted.");
    loadMembers();
  };

  if (loading) return <div style={wrap}>Loading board members...</div>;

  return (
    <div style={wrap}>
      <div>
        <h1 style={title}>Board Members</h1>
        <div style={subtitle}>
          Manage board names, roles, and public contact information for the public site.
        </div>
      </div>

      <div style={tileGrid}>
        <StatTile label="Listed Members" value={members.length} />
        <StatTile label="Public Active" value={members.filter((member) => member.is_active !== false).length} />
        <StatTile label="Hidden" value={members.filter((member) => member.is_active === false).length} />
      </div>

      {status && <div style={statusBox}>{status}</div>}

      <section style={panel}>
        <div style={panelTitle}>{editingId ? "Edit Board Member" : "Add Board Member"}</div>
        <div style={formGrid}>
          <Field label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Field label="Role" value={form.role} onChange={(value) => setForm({ ...form, role: value })} />
          <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
          <Field label="Sort Order" type="number" value={form.display_order} onChange={(value) => setForm({ ...form, display_order: value })} />
          <label style={checkField}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
            />
            Show on public site
          </label>
        </div>
        <div style={actionRow}>
          <button type="button" style={saveBtn} onClick={saveMember}>
            {editingId ? "Save Changes" : "Add Board Member"}
          </button>
          {editingId && (
            <button
              type="button"
              style={cancelBtn}
              onClick={() => {
                setEditingId(null);
                setForm(blankForm);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      <section style={panel}>
        <div style={panelTitle}>Current Board</div>
        <div style={memberGrid}>
          {members.map((member) => (
            <article key={member.id} style={memberCard}>
              <div style={memberTop}>
                <div>
                  <div style={memberName}>{member.name}</div>
                  <div style={memberRole}>{member.role || "Role not set"}</div>
                </div>
                <span style={member.is_active === false ? hiddenPill : activePill}>
                  {member.is_active === false ? "Hidden" : "Public"}
                </span>
              </div>
              <div style={contactList}>
                <ContactLine label="Email" value={member.email} />
                <ContactLine label="Phone" value={formatPhone(member.phone)} />
                <ContactLine label="Order" value={String(member.display_order || 0)} />
              </div>
              <div style={cardActions}>
                <button type="button" style={editBtn} onClick={() => editMember(member)}>Edit</button>
                <button type="button" style={deleteBtn} onClick={() => deleteMember(member.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
        {!members.length && <div style={emptyText}>No board members listed yet.</div>}
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label style={field}>
      <span style={labelStyle}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={input}
      />
    </label>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={statTile}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

function ContactLine({ label, value }) {
  return (
    <div style={contactLine}>
      <span>{label}</span>
      <strong>{value || "Not listed"}</strong>
    </div>
  );
}

function cleanPhone(value) {
  return (value || "").toString().replace(/[^\d]/g, "");
}

function formatPhone(value) {
  const digits = cleanPhone(value);
  if (digits.length !== 10) return value || "";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const wrap = { display: "flex", flexDirection: "column", gap: 18 };
const title = { color: "#0f172a", fontSize: 28, fontWeight: 900, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 14, fontWeight: 700, marginTop: 6 };
const tileGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" };
const statTile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 16 };
const statLabel = { color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const statValue = { color: "#0f172a", fontSize: 32, fontWeight: 950, marginTop: 4 };
const statusBox = { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, color: "#1e3a8a", fontSize: 13, fontWeight: 800, padding: 12 };
const panel = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 18 };
const panelTitle = { color: "#0f172a", fontSize: 18, fontWeight: 900, marginBottom: 12 };
const formGrid = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" };
const field = { display: "grid", gap: 6 };
const labelStyle = { color: "#475569", fontSize: 11, fontWeight: 900, textTransform: "uppercase" };
const input = { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, boxSizing: "border-box", color: "#0f172a", fontWeight: 800, padding: "10px 11px", width: "100%" };
const checkField = { alignItems: "center", color: "#334155", display: "flex", fontSize: 13, fontWeight: 850, gap: 8, paddingTop: 22 };
const actionRow = { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 };
const saveBtn = { background: "#16a34a", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 900, padding: "10px 13px" };
const cancelBtn = { background: "#e2e8f0", border: "none", borderRadius: 10, color: "#0f172a", cursor: "pointer", fontWeight: 900, padding: "10px 13px" };
const memberGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" };
const memberCard = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 14 };
const memberTop = { alignItems: "flex-start", display: "flex", gap: 12, justifyContent: "space-between" };
const memberName = { color: "#0f172a", fontSize: 17, fontWeight: 900 };
const memberRole = { color: "#64748b", fontSize: 13, fontWeight: 800, marginTop: 3 };
const activePill = { background: "#dcfce7", borderRadius: 999, color: "#166534", fontSize: 11, fontWeight: 900, padding: "5px 8px" };
const hiddenPill = { background: "#e5e7eb", borderRadius: 999, color: "#475569", fontSize: 11, fontWeight: 900, padding: "5px 8px" };
const contactList = { display: "grid", gap: 6, marginTop: 14 };
const contactLine = { color: "#64748b", display: "flex", fontSize: 12, fontWeight: 800, justifyContent: "space-between", gap: 12 };
const cardActions = { display: "flex", gap: 8, marginTop: 14 };
const editBtn = { background: "#0f172a", border: "none", borderRadius: 9, color: "#fff", cursor: "pointer", fontWeight: 900, padding: "8px 10px" };
const deleteBtn = { background: "#fee2e2", border: "none", borderRadius: 9, color: "#991b1b", cursor: "pointer", fontWeight: 900, padding: "8px 10px" };
const emptyText = { color: "#64748b", fontSize: 13, fontWeight: 800 };
