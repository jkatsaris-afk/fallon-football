import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";

export default function ComplaintFormPage() {
  const [coaches, setCoaches] = useState([]);
  const [refs, setRefs] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [form, setForm] = useState({
    subjectType: "coach",
    coachId: "",
    refereeId: "",
    summary: "",
    details: "",
    division: "",
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    const [{ data: coachData }, { data: refData }, { data: divisionData }] = await Promise.all([
      supabase.from("coaches").select("id,first_name,last_name,status,division_preference").order("last_name", { ascending: true }),
      supabase.from("referees").select("id,first_name,last_name,status").order("last_name", { ascending: true }),
      supabase.from("divisions").select("id,name").order("name", { ascending: true }),
    ]);
    setCoaches(coachData || []);
    setRefs(refData || []);
    setDivisions(divisionData || []);
  };

  const people = useMemo(() => (
    form.subjectType === "coach" ? coaches : refs
  ), [coaches, form.subjectType, refs]);

  const submitComplaint = async () => {
    setStatus("");
    if (!form.summary.trim()) {
      setStatus("Please add a short summary.");
      return;
    }

    setLoading(true);
    const payload = {
      subject_type: form.subjectType,
      coach_id: form.subjectType === "coach" ? form.coachId || null : null,
      referee_id: form.subjectType === "referee" ? form.refereeId || null : null,
      division: form.division,
      summary: form.summary,
      details: form.details,
      status: "open",
    };

    const { error } = await supabase.from("complaints").insert([payload]);
    setLoading(false);

    if (error) {
      console.error(error);
      setStatus("Complaint could not be submitted. The complaint form may not be set up yet.");
      return;
    }

    setForm({ subjectType: "coach", coachId: "", refereeId: "", summary: "", details: "", division: "" });
    setStatus("Complaint submitted. Thank you for helping us review this.");
  };

  return (
    <div style={wrap}>
      <section style={card}>
        <div style={eyebrow}>Anonymous Form</div>
        <h1 style={title}>Submit a Complaint</h1>
        <p style={copy}>
          This form does not require your name. Please include enough detail for the board to review the concern.
        </p>

        {status && <div style={statusBox}>{status}</div>}

        <div style={grid}>
          <label style={field}>
            <span style={label}>Complaint About</span>
            <select
              value={form.subjectType}
              onChange={(e) => setForm({ ...form, subjectType: e.target.value, coachId: "", refereeId: "" })}
              style={input}
            >
              <option value="coach">Coach</option>
              <option value="referee">Referee</option>
            </select>
          </label>

          <label style={field}>
            <span style={label}>Select Person</span>
            <select
              value={form.subjectType === "coach" ? form.coachId : form.refereeId}
              onChange={(e) => setForm({
                ...form,
                coachId: form.subjectType === "coach" ? e.target.value : "",
                refereeId: form.subjectType === "referee" ? e.target.value : "",
              })}
              style={input}
            >
              <option value="">Not sure / not listed</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.first_name} {person.last_name}
                </option>
              ))}
            </select>
          </label>

          <label style={field}>
            <span style={label}>Division</span>
            <select
              value={form.division}
              onChange={(e) => setForm({ ...form, division: e.target.value })}
              style={input}
            >
              <option value="">Not sure / not listed</option>
              {divisions.map((division) => (
                <option key={division.id} value={division.name}>{division.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={field}>
          <span style={label}>Short Summary</span>
          <input
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="What happened?"
            style={input}
          />
        </label>

        <label style={field}>
          <span style={label}>Details</span>
          <textarea
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            placeholder="Add dates, game, field, and any details the board should know."
            style={textarea}
          />
        </label>

        <button style={submitBtn} onClick={submitComplaint} disabled={loading}>
          {loading ? "Submitting..." : "Submit Complaint"}
        </button>
      </section>
    </div>
  );
}

const wrap = { background: "#f8fafc", minHeight: "100vh", padding: "28px 16px" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 18px 40px rgba(15,23,42,0.10)", margin: "0 auto", maxWidth: 780, padding: 24 };
const eyebrow = { color: "#166534", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const title = { color: "#0f172a", fontSize: 30, fontWeight: 900, margin: "6px 0" };
const copy = { color: "#475569", fontWeight: 700, lineHeight: 1.45, marginTop: 0 };
const grid = { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" };
const field = { display: "flex", flexDirection: "column", gap: 7, marginTop: 12 };
const label = { color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const input = { border: "1px solid #cbd5e1", borderRadius: 12, fontSize: 16, padding: "12px 13px" };
const textarea = { ...input, minHeight: 150, resize: "vertical" };
const submitBtn = { background: "#166534", border: "none", borderRadius: 14, color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 900, marginTop: 16, padding: "14px 18px", width: "100%" };
const statusBox = { background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 12, color: "#166534", fontWeight: 800, margin: "12px 0", padding: "10px 12px" };
