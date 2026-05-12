import React, { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import { supabase } from "../../supabase";

export default function BoardMembersPage() {
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    const { data, error } = await supabase
      .from("board_members")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Public board members load failed:", error);
      setStatus("Board member contacts are not available yet.");
      setMembers([]);
      return;
    }

    setStatus("");
    setMembers(data || []);
  };

  return (
    <div style={wrap}>
      <section style={hero}>
        <div style={eyebrow}>League Contacts</div>
        <h1 style={title}>Board Members</h1>
        <p style={copy}>
          Contact information for Fallon Football board members and league roles.
        </p>
      </section>

      {status && <div style={statusBox}>{status}</div>}

      <section style={grid}>
        {members.map((member) => (
          <article key={member.id} style={card}>
            <div style={memberName}>{member.name}</div>
            <div style={memberRole}>{member.role || "Board Member"}</div>
            <div style={contactList}>
              {member.email && (
                <a href={`mailto:${member.email}`} style={contactLink}>
                  <Mail size={16} />
                  <span>{member.email}</span>
                </a>
              )}
              {member.phone && (
                <a href={`tel:${cleanPhone(member.phone)}`} style={contactLink}>
                  <Phone size={16} />
                  <span>{formatPhone(member.phone)}</span>
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      {!members.length && !status && (
        <section style={emptyCard}>Board members have not been posted yet.</section>
      )}
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

const wrap = { display: "flex", flexDirection: "column", gap: 12 };
const hero = { background: "#0f172a", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.16)", color: "#fff", padding: 20 };
const eyebrow = { color: "#86efac", fontSize: 12, fontWeight: 900, letterSpacing: 0, textTransform: "uppercase" };
const title = { fontSize: 32, fontWeight: 900, lineHeight: 1, margin: "6px 0 0" };
const copy = { color: "#d1d5db", fontSize: 14, fontWeight: 700, lineHeight: 1.35, margin: "10px 0 0" };
const statusBox = { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, color: "#9a3412", fontSize: 13, fontWeight: 800, padding: 12 };
const grid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" };
const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.05)", padding: 14 };
const memberName = { color: "#111827", fontSize: 18, fontWeight: 900 };
const memberRole = { color: "#0f7a3b", fontSize: 13, fontWeight: 900, marginTop: 4 };
const contactList = { display: "grid", gap: 8, marginTop: 14 };
const contactLink = { alignItems: "center", color: "#334155", display: "flex", fontSize: 13, fontWeight: 800, gap: 8, textDecoration: "none" };
const emptyCard = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, color: "#64748b", fontSize: 13, fontWeight: 800, padding: 14 };
