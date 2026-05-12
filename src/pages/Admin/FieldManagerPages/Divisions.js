import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

export default function Divisions() {
  const [divisions, setDivisions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeView, setActiveView] = useState("overview");
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data, error } = await supabase
      .from("divisions")
      .select("*")
      .order("name", { ascending: true });

    const { data: playerData } = await supabase
      .from("players")
      .select("id, division_id");

    const { data: teamData } = await supabase
      .from("teams")
      .select("id, division");

    const { data: matchupData } = await supabase
      .from("matchups")
      .select("id, division");

    const { data: fieldData } = await supabase
      .from("fields")
      .select("id, division, is_active");

    if (error) {
      console.error("Division load error:", error);
      setStatus({ type: "error", message: "Could not load divisions." });
      return;
    }

    setDivisions(data || []);
    setPlayers(playerData || []);
    setTeams(teamData || []);
    setMatchups(matchupData || []);
    setFields(fieldData || []);
  };

  const divisionStats = useMemo(() => {
    return divisions.map((division) => ({
      ...division,
      players: players.filter((player) => player.division_id === division.id).length,
      teams: teams.filter((team) => normalizeDivision(team.division) === normalizeDivision(division.name)).length,
      matchups: matchups.filter((matchup) => normalizeDivision(matchup.division) === normalizeDivision(division.name)).length,
      fields: fields.filter((field) => (
        field.is_active !== false &&
        normalizeDivision(field.division) === normalizeDivision(division.name)
      )).length,
    }));
  }, [divisions, fields, matchups, players, teams]);

  const totals = useMemo(() => ({
    divisions: divisions.length,
    players: divisionStats.reduce((sum, division) => sum + division.players, 0),
    teams: divisionStats.reduce((sum, division) => sum + division.teams, 0),
    matchups: divisionStats.reduce((sum, division) => sum + division.matchups, 0),
  }), [divisionStats, divisions.length]);

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
    loadData();
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
    loadData();
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
    loadData();
  };

  return (
    <div style={pageWrap}>
      <div>
        <h1 style={title}>Division Manager</h1>
        <div style={subtitle}>
          Manage the division names used for players, teams, matchups, fields, and championship seeding.
        </div>
      </div>

      <div style={toolGrid}>
        <ToolTile
          title="Overview"
          text="Review division setup and usage"
          active={activeView === "overview"}
          onClick={() => setActiveView("overview")}
        />
        <ToolTile
          title="Manage Divisions"
          text="Add, rename, or remove divisions"
          active={activeView === "manage"}
          onClick={() => setActiveView("manage")}
        />
      </div>

      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      {activeView === "overview" && (
        <>
          <div style={overviewGrid}>
            <OverviewTile title="Divisions" value={totals.divisions} text="Configured divisions" />
            <OverviewTile title="Players" value={totals.players} text="Assigned to divisions" />
            <OverviewTile title="Teams" value={totals.teams} text="Using division names" />
            <OverviewTile title="Matchups" value={totals.matchups} text="Regular season matchup rows" />
          </div>

          <section style={section}>
            <div style={sectionTitle}>Division Usage</div>
            <div style={sectionSub}>
              Use this to catch missing teams, empty divisions, or field assignments before scheduling.
            </div>

            <div style={divisionGrid}>
              {divisionStats.map((division) => (
                <div key={division.id} style={divisionCard}>
                  <div style={divisionName}>{division.name}</div>
                  <div style={metricRow}>
                    <Metric label="Players" value={division.players} />
                    <Metric label="Teams" value={division.teams} />
                    <Metric label="Matchups" value={division.matchups} />
                    <Metric label="Fields" value={division.fields} />
                  </div>
                </div>
              ))}
            </div>

            {!divisionStats.length && (
              <div style={empty}>No divisions have been created yet.</div>
            )}
          </section>
        </>
      )}

      {activeView === "manage" && (
        <section style={section}>
          <div style={sectionTitle}>Manage Divisions</div>
          <div style={sectionSub}>
            Rename with care. These names are used across teams, matchups, field assignment, and schedule tools.
          </div>

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

          {!divisions.length && (
            <div style={empty}>No divisions have been created yet.</div>
          )}
        </section>
      )}
    </div>
  );
}

function ToolTile({ title, text, active, onClick }) {
  return (
    <button type="button" style={{ ...toolTile, ...(active ? activeToolTile : {}) }} onClick={onClick}>
      <div style={toolTitle}>{title}</div>
      <div style={toolText}>{text}</div>
    </button>
  );
}

function OverviewTile({ title, value, text }) {
  return (
    <div style={overviewTile}>
      <div style={overviewLabel}>{title}</div>
      <div style={overviewValue}>{value}</div>
      <div style={overviewText}>{text}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={metricBox}>
      <div style={metricValue}>{value}</div>
      <div style={metricLabel}>{label}</div>
    </div>
  );
}

function normalizeDivision(value) {
  return (value || "").toString().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

const pageWrap = { display: "flex", flexDirection: "column", gap: 18 };
const title = { color: "#0f172a", fontSize: 28, fontWeight: 900, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 14, fontWeight: 700, marginTop: 6 };
const toolGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 };
const toolTile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", cursor: "pointer", minHeight: 100, padding: 18, textAlign: "left" };
const activeToolTile = { outline: "2px solid #16a34a", boxShadow: "0 10px 28px rgba(22,163,74,0.16)" };
const toolTitle = { color: "#0f172a", fontSize: 16, fontWeight: 900 };
const toolText = { color: "#64748b", fontSize: 13, fontWeight: 700, lineHeight: 1.4, marginTop: 8 };
const overviewGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 };
const overviewTile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 16 };
const overviewLabel = { color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const overviewValue = { color: "#0f172a", fontSize: 32, fontWeight: 950, marginTop: 4 };
const overviewText = { color: "#64748b", fontSize: 12, fontWeight: 750, marginTop: 3 };
const section = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 18 };
const sectionTitle = { color: "#0f172a", fontSize: 18, fontWeight: 900 };
const sectionSub = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 4 };
const addRow = { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" };
const input = { background: "#f8fafc", padding: 10, borderRadius: 10, border: "1px solid #cbd5e1", flex: 1, minWidth: 180 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 14, marginTop: 18 };
const card = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 12 };
const actionRow = { display: "flex", gap: 8, marginTop: 10 };
const addBtn = { padding: "10px 14px", borderRadius: 10, background: "#16a34a", color: "#fff", border: "none", cursor: "pointer", fontWeight: 900 };
const saveBtn = { padding: "8px 12px", borderRadius: 9, background: "#0f172a", color: "#fff", border: "none", cursor: "pointer", fontWeight: 850 };
const deleteBtn = { padding: "8px 12px", borderRadius: 9, background: "#fee2e2", color: "#991b1b", border: "none", cursor: "pointer", fontWeight: 850 };
const statusBox = { marginTop: 12, padding: "10px 12px", borderRadius: 10, fontSize: 13, fontWeight: 700 };
const successBox = { background: "#dcfce7", color: "#166534" };
const errorBox = { background: "#fee2e2", color: "#991b1b" };
const divisionGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 14 };
const divisionCard = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 };
const divisionName = { color: "#0f172a", fontSize: 17, fontWeight: 900 };
const metricRow = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 12 };
const metricBox = { background: "#fff", borderRadius: 10, padding: 9, textAlign: "center" };
const metricValue = { color: "#0f172a", fontSize: 20, fontWeight: 950 };
const metricLabel = { color: "#64748b", fontSize: 10, fontWeight: 850, marginTop: 2, textTransform: "uppercase" };
const empty = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 14, textAlign: "center" };
