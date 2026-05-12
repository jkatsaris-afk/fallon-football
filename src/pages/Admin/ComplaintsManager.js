import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, Link2, PlusCircle, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../../supabase";

export default function ComplaintsManager() {
  const [tab, setTab] = useState("overview");
  const [complaints, setComplaints] = useState([]);
  const [notes, setNotes] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [refs, setRefs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [draftNotes, setDraftNotes] = useState({});
  const [resolutions, setResolutions] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setStatus("");

    const [{ data: complaintData, error: complaintError }, { data: noteData }, { data: coachData }, { data: refData }] = await Promise.all([
      supabase.from("complaints").select("*").order("created_at", { ascending: false }),
      supabase.from("complaint_notes").select("*").order("created_at", { ascending: true }),
      supabase.from("coaches").select("id,first_name,last_name,email"),
      supabase.from("referees").select("id,first_name,last_name,email"),
    ]);

    if (complaintError) {
      console.error(complaintError);
      setStatus("Complaints are not set up yet. Run the complaints SQL, then refresh this page.");
      setComplaints([]);
      setNotes([]);
    } else {
      setComplaints(complaintData || []);
      setNotes(noteData || []);
    }

    setCoaches(coachData || []);
    setRefs(refData || []);
    setLoading(false);
  };

  const openComplaints = complaints.filter((complaint) => (complaint.status || "open") !== "closed");
  const closedComplaints = complaints.filter((complaint) => (complaint.status || "open") === "closed");
  const visibleComplaints = tab === "closed" ? closedComplaints : tab === "open" ? openComplaints : complaints;

  const subjectMap = useMemo(() => {
    const map = {};
    coaches.forEach((coach) => {
      map[`coach:${coach.id}`] = getName(coach);
    });
    refs.forEach((ref) => {
      map[`referee:${ref.id}`] = getName(ref);
    });
    return map;
  }, [coaches, refs]);

  const toggleSelect = (id) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    ));
  };

  const addNote = async (complaintId) => {
    const note = (draftNotes[complaintId] || "").trim();
    if (!note) return;

    const { error } = await supabase.from("complaint_notes").insert([{ complaint_id: complaintId, note }]);
    if (error) {
      console.error(error);
      setStatus("Note could not be added. Make sure complaint_notes SQL is installed.");
      return;
    }

    setDraftNotes((current) => ({ ...current, [complaintId]: "" }));
    await loadData();
  };

  const combineSelected = async () => {
    if (selectedIds.length < 2) {
      setStatus("Select at least two complaints to combine into one investigation.");
      return;
    }

    const investigationId = crypto.randomUUID();
    const { error } = await supabase
      .from("complaints")
      .update({ investigation_id: investigationId })
      .in("id", selectedIds);

    if (error) {
      console.error(error);
      setStatus("Could not combine complaints. Run the investigation SQL column first.");
      return;
    }

    setSelectedIds([]);
    setStatus("Complaints combined into one investigation.");
    await loadData();
  };

  const closeComplaint = async (complaint) => {
    const boardResolution = (resolutions[complaint.id] || "").trim();
    if (!boardResolution) {
      setStatus("Add a board resolution before closing the complaint.");
      return;
    }

    const update = {
      status: "closed",
      board_resolution: boardResolution,
      closed_at: new Date().toISOString(),
    };

    let query = supabase.from("complaints").update(update);
    query = complaint.investigation_id
      ? query.eq("investigation_id", complaint.investigation_id)
      : query.eq("id", complaint.id);

    const { error } = await query;
    if (error) {
      console.error(error);
      setStatus("Complaint could not be closed.");
      return;
    }

    setStatus("Complaint closed with board resolution.");
    await loadData();
  };

  const complaintUrl = `${window.location.origin}/complaint`;

  const downloadFlyer = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setStatus("The browser blocked the flyer window. Allow pop-ups and try again.");
      return;
    }

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(complaintUrl)}`;
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Fallon Football Complaint Form Flyer</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #0f172a; }
            .page { align-items: center; display: flex; flex-direction: column; min-height: 100vh; padding: 42px; text-align: center; }
            .eyebrow { color: #166534; font-size: 17px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
            h1 { font-size: 46px; line-height: 1.05; margin: 14px 0 8px; }
            .copy { color: #475569; font-size: 20px; font-weight: 700; line-height: 1.35; max-width: 680px; }
            .qr { border: 8px solid #0f172a; border-radius: 28px; margin: 34px 0 18px; padding: 18px; width: 390px; }
            .qr img { display: block; width: 100%; }
            .url { background: #ecfdf5; border: 2px solid #86efac; border-radius: 16px; color: #14532d; font-size: 22px; font-weight: 900; padding: 14px 18px; }
            .small { color: #64748b; font-size: 14px; font-weight: 700; margin-top: 20px; max-width: 620px; }
            @media print { @page { margin: .35in; } .page { padding: 18px; } }
          </style>
        </head>
        <body>
          <main class="page">
            <div class="eyebrow">Fallon Football</div>
            <h1>Need to Report a Concern?</h1>
            <div class="copy">Scan this QR code to submit an anonymous coach or referee complaint for board review.</div>
            <div class="qr"><img src="${qrUrl}" alt="Complaint form QR code" /></div>
            <div class="url">${complaintUrl}</div>
            <div class="small">Please include the division, person involved if known, game date, field, and details that help the board review the concern.</div>
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  };

  if (loading) return <div style={wrap}>Loading complaints...</div>;

  return (
    <div style={wrap}>
      <div>
        <h1 style={title}>Complaints</h1>
        <div style={subtitle}>Track anonymous reports, combine related items into investigations, and close them with board resolutions.</div>
      </div>

      <div style={tileGrid}>
        <Tile icon={FileText} label="Overview" value={complaints.length} active={tab === "overview"} onClick={() => setTab("overview")} />
        <Tile icon={AlertTriangle} label="Open Complaints" value={openComplaints.length} active={tab === "open"} onClick={() => setTab("open")} />
        <Tile icon={CheckCircle2} label="Closed Complaints" value={closedComplaints.length} active={tab === "closed"} onClick={() => setTab("closed")} />
      </div>

      <section style={qrSection}>
        <div style={qrCopy}>
          <div style={sectionTitle}>Public Complaint Form</div>
          <div style={sectionSub}>{complaintUrl}</div>
          <div style={qrActions}>
            <button style={actionBtn} onClick={() => window.open(complaintUrl, "_blank")}>
              <QrCode size={17} />
              Open Form
            </button>
            <button style={darkBtn} onClick={downloadFlyer}>
              <Download size={17} />
              Download Flyer
            </button>
          </div>
        </div>
        <div style={qrBox}>
          <QRCodeSVG value={complaintUrl} size={128} level="M" includeMargin />
        </div>
      </section>

      {status && <div style={statusBox}>{status}</div>}

      <section style={section}>
        <div style={sectionHeader}>
          <div>
            <div style={sectionTitle}>{tab === "closed" ? "Closed Complaints" : tab === "open" ? "Open Complaints" : "Current Complaints"}</div>
            <div style={sectionSub}>Public form link: /complaint</div>
          </div>
          <button style={actionBtn} onClick={combineSelected}>
            <Link2 size={17} />
            Combine Selected
          </button>
        </div>

        {!visibleComplaints.length && <div style={empty}>No complaints found for this view.</div>}

        <div style={list}>
          {visibleComplaints.map((complaint) => {
            const subjectKey = complaint.subject_type === "referee"
              ? `referee:${complaint.referee_id}`
              : `coach:${complaint.coach_id}`;
            const complaintNotes = notes.filter((note) => note.complaint_id === complaint.id);

            return (
              <article key={complaint.id} style={card}>
                <div style={cardTop}>
                  <label style={selectRow}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(complaint.id)}
                      onChange={() => toggleSelect(complaint.id)}
                    />
                    <span style={badge}>{complaint.status || "open"}</span>
                  </label>
                  <div style={dateText}>{formatDate(complaint.created_at)}</div>
                </div>

                <div style={complaintTitle}>{complaint.summary || "Complaint"}</div>
                <div style={meta}>
                  {complaint.subject_type || "coach"}: {subjectMap[subjectKey] || "Not selected"}
                  {complaint.investigation_id ? ` | Investigation ${String(complaint.investigation_id).slice(0, 8)}` : ""}
                </div>
                {complaint.details && <p style={details}>{complaint.details}</p>}

                {!!complaintNotes.length && (
                  <div style={notesList}>
                    {complaintNotes.map((note) => (
                      <div key={note.id} style={noteRow}>
                        <strong>{formatDate(note.created_at)}:</strong> {note.note}
                      </div>
                    ))}
                  </div>
                )}

                {(complaint.status || "open") !== "closed" && (
                  <div style={toolGrid}>
                    <textarea
                      placeholder="Add investigation note"
                      value={draftNotes[complaint.id] || ""}
                      onChange={(e) => setDraftNotes((current) => ({ ...current, [complaint.id]: e.target.value }))}
                      style={textarea}
                    />
                    <button style={smallBtn} onClick={() => addNote(complaint.id)}>
                      <PlusCircle size={16} />
                      Add Note
                    </button>
                    <textarea
                      placeholder="Board resolution before closing"
                      value={resolutions[complaint.id] || ""}
                      onChange={(e) => setResolutions((current) => ({ ...current, [complaint.id]: e.target.value }))}
                      style={textarea}
                    />
                    <button style={closeBtn} onClick={() => closeComplaint(complaint)}>
                      Close
                    </button>
                  </div>
                )}

                {complaint.board_resolution && (
                  <div style={resolutionBox}>
                    <strong>Board resolution:</strong> {complaint.board_resolution}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Tile({ icon: Icon, label, value, active, onClick }) {
  return (
    <button style={{ ...tile, ...(active ? activeTile : {}) }} onClick={onClick}>
      <Icon size={24} color={active ? "#166534" : "#64748b"} />
      <div style={tileValue}>{value}</div>
      <div style={tileLabel}>{label}</div>
    </button>
  );
}

function getName(person) {
  return `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || "Unknown";
}

function formatDate(value) {
  if (!value) return "Date TBD";
  return new Date(value).toLocaleDateString();
}

const wrap = { display: "flex", flexDirection: "column", gap: 18 };
const title = { color: "#0f172a", fontSize: 28, fontWeight: 900, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 14, fontWeight: 700, marginTop: 6 };
const tileGrid = { display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" };
const tile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", cursor: "pointer", padding: 18, textAlign: "left" };
const activeTile = { borderColor: "#86efac", boxShadow: "0 14px 30px rgba(22,101,52,0.14)" };
const tileValue = { color: "#0f172a", fontSize: 26, fontWeight: 900, marginTop: 10 };
const tileLabel = { color: "#64748b", fontSize: 13, fontWeight: 800 };
const section = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", padding: 18 };
const sectionHeader = { alignItems: "center", display: "flex", gap: 14, justifyContent: "space-between" };
const sectionTitle = { color: "#0f172a", fontSize: 20, fontWeight: 900 };
const sectionSub = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 4 };
const actionBtn = { alignItems: "center", background: "#166534", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", display: "flex", fontWeight: 900, gap: 8, padding: "11px 14px" };
const darkBtn = { ...actionBtn, background: "#0f172a" };
const qrSection = { alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", display: "flex", gap: 16, justifyContent: "space-between", padding: 18 };
const qrCopy = { display: "grid", gap: 8 };
const qrActions = { display: "flex", flexWrap: "wrap", gap: 10 };
const qrBox = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 8 };
const list = { display: "grid", gap: 14, marginTop: 16 };
const card = { border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 };
const cardTop = { alignItems: "center", display: "flex", justifyContent: "space-between" };
const selectRow = { alignItems: "center", display: "flex", gap: 8 };
const badge = { background: "#ecfdf5", borderRadius: 999, color: "#166534", fontSize: 12, fontWeight: 900, padding: "5px 9px", textTransform: "capitalize" };
const dateText = { color: "#64748b", fontSize: 12, fontWeight: 800 };
const complaintTitle = { color: "#0f172a", fontSize: 18, fontWeight: 900, marginTop: 10 };
const meta = { color: "#64748b", fontSize: 13, fontWeight: 800, marginTop: 4 };
const details = { color: "#334155", marginBottom: 0 };
const notesList = { background: "#f8fafc", borderRadius: 12, display: "grid", gap: 8, marginTop: 12, padding: 12 };
const noteRow = { color: "#334155", fontSize: 13 };
const toolGrid = { display: "grid", gap: 10, gridTemplateColumns: "minmax(220px, 1fr) auto minmax(220px, 1fr) auto", marginTop: 14 };
const textarea = { border: "1px solid #cbd5e1", borderRadius: 12, minHeight: 58, padding: 10, resize: "vertical" };
const smallBtn = { alignItems: "center", alignSelf: "stretch", background: "#0f172a", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", display: "flex", fontWeight: 900, gap: 6, justifyContent: "center", padding: "10px 12px" };
const closeBtn = { ...smallBtn, background: "#991b1b" };
const resolutionBox = { background: "#f8fafc", borderRadius: 12, color: "#334155", marginTop: 12, padding: 12 };
const statusBox = { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, color: "#9a3412", fontWeight: 800, padding: "10px 12px" };
const empty = { color: "#64748b", fontWeight: 700, padding: 20, textAlign: "center" };
