import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";
import { applyPersonSeasonFilter, getActiveSeason, withSeasonPayload } from "../../utils/season";

import bills from "../../resources/Buffalo Bills.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import broncos from "../../resources/Denver Broncos.png";
import lions from "../../resources/Detroit Lions.png";
import colts from "../../resources/Indianapolis Colts.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import jets from "../../resources/New York Jets.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import steelers from "../../resources/Pittsburgh Steelers.png";
import niners from "../../resources/San Francisco 49ers.png";
import ravens from "../../resources/Baltimore Ravens.png";

const TEAM_LOGOS = {
  bills,
  bengals,
  broncos,
  lions,
  colts,
  chiefs,
  raiders,
  rams,
  jets,
  eagles,
  steelers,
  "49ers": niners,
  ravens,
};

const EMPTY_FORM = {
  nflTeamId: "",
  fullName: "",
  shortName: "",
  division: "",
  coachId: "",
  assistantCoachId: "",
  logoFile: null,
};

export default function TeamsPage() {
  const [activeView, setActiveView] = useState("overview");
  const [nflTeams, setNflTeams] = useState([]);
  const [teams, setTeams] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [teamForm, setTeamForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const active = await getActiveSeason();
    const { data: nfl } = await supabase
      .from("nfl_teams")
      .select("*")
      .order("full_name", { ascending: true });
    const { data: t } = await applyPersonSeasonFilter(supabase.from("teams").select("*"), active);
    const { data: c } = await applyPersonSeasonFilter(supabase
      .from("coaches")
      .select("*")
      .order("first_name", { ascending: true }), active);
    const { data: p } = await applyPersonSeasonFilter(supabase
      .from("players")
      .select("*, divisions(name)"), active);
    const { data: d } = await supabase
      .from("divisions")
      .select("name")
      .order("name", { ascending: true });

    setNflTeams(nfl || []);
    setTeams(t || []);
    setCoaches(c || []);
    setPlayers(p || []);
    setDivisions((d || []).map((division) => division.name));
  };

  const nflById = useMemo(() => {
    const map = {};
    nflTeams.forEach((team) => {
      map[team.id] = team;
    });
    return map;
  }, [nflTeams]);

  const teamCards = useMemo(() => (
    teams.map((team) => {
      const meta = nflById[team.nfl_team_id] || {};
      const ranking = getTeamRanking(team.id, players);
      const roster = players.filter((player) => player.team_id === team.id);

      return {
        ...team,
        fullName: meta.full_name || meta.short_name || "Unnamed Team",
        shortName: meta.short_name || meta.full_name || "Team",
        logo: getLogo(meta),
        ranking,
        players: roster.length,
      };
    }).sort((a, b) => (
      sortDivisions(a.division, b.division) || a.fullName.localeCompare(b.fullName)
    ))
  ), [nflById, players, teams]);

  const teamsByDivision = useMemo(() => {
    return teamCards.reduce((groups, team) => {
      const division = team.division || "Unassigned";
      if (!groups[division]) groups[division] = [];
      groups[division].push(team);
      return groups;
    }, {});
  }, [teamCards]);

  const totals = useMemo(() => ({
    teams: teams.length,
    divisions: Object.keys(teamsByDivision).length,
    rosteredPlayers: players.filter((player) => player.team_id).length,
    unassignedPlayers: players.filter((player) => !player.team_id).length,
  }), [players, teams.length, teamsByDivision]);

  const getCoachName = (id) => {
    const coach = coaches.find((item) => item.id === id);
    return coach ? `${coach.first_name || ""} ${coach.last_name || ""}`.trim() : "-";
  };

  const selectTemplate = (template) => {
    setTeamForm((current) => ({
      ...current,
      nflTeamId: template.id,
      fullName: template.full_name || "",
      shortName: template.short_name || "",
      logoFile: null,
    }));
    setActiveView("create");
    setStatus(null);
  };

  const createTeam = async () => {
    setStatus(null);

    if (!teamForm.division) {
      setStatus({ type: "error", message: "Select a division before creating the team." });
      return;
    }

    let nflTeamId = teamForm.nflTeamId || null;

    if (!nflTeamId) {
      const fullName = teamForm.fullName.trim();
      const shortName = teamForm.shortName.trim() || fullName;

      if (!fullName) {
        setStatus({ type: "error", message: "Enter a team name before creating the team." });
        return;
      }

      let logoUrl = "";
      if (teamForm.logoFile) {
        const uploadedLogo = await uploadTeamLogo(teamForm.logoFile, shortName || fullName);
        if (!uploadedLogo.ok) {
          setStatus({ type: "error", message: uploadedLogo.message });
          return;
        }
        logoUrl = uploadedLogo.url;
      }

      const { data: newNflTeam, error: nflError } = await supabase
        .from("nfl_teams")
        .insert({
          full_name: fullName,
          short_name: shortName,
          logo: logoUrl || null,
        })
        .select("*")
        .single();

      if (nflError) {
        console.error("Team template create error:", nflError);
        setStatus({ type: "error", message: `Team template could not be created: ${nflError.message}` });
        return;
      }

      nflTeamId = newNflTeam.id;
    }

    const active = await getActiveSeason();
    const { error } = await supabase.from("teams").insert(withSeasonPayload({
      nfl_team_id: nflTeamId,
      division: teamForm.division,
      coach_id: teamForm.coachId || null,
      assistant_coach_id: teamForm.assistantCoachId || null,
    }, active));

    if (error) {
      console.error("Team create error:", error);
      setStatus({ type: "error", message: `Team could not be created: ${error.message}` });
      return;
    }

    setStatus({ type: "success", message: "Team created." });
    setTeamForm(EMPTY_FORM);
    setActiveView("manage");
    await loadData();
  };

  const removeFromTeam = async (playerId) => {
    await supabase.from("players").update({ team_id: null }).eq("id", playerId);
    loadData();
  };

  const addPlayerToTeam = async (playerId) => {
    await supabase.from("players").update({ team_id: activeTeam.id }).eq("id", playerId);
    loadData();
  };

  const autoRoster = async () => {
    const divisionPlayers = players.filter((player) => (
      !player.team_id && player.divisions?.name === activeTeam.division
    ));
    const divisionTeams = teams.filter((team) => team.division === activeTeam.division);

    if (!divisionTeams.length) return;

    let index = 0;
    for (const player of divisionPlayers) {
      const team = divisionTeams[index];
      await supabase.from("players").update({ team_id: team.id }).eq("id", player.id);
      index += 1;
      if (index >= divisionTeams.length) index = 0;
    }

    loadData();
  };

  if (activeTeam) {
    const team = teamCards.find((item) => item.id === activeTeam.id) || activeTeam;
    const teamPlayers = players.filter((player) => player.team_id === activeTeam.id);
    const teamRanking = getTeamRanking(activeTeam.id, players);

    return (
      <div style={pageWrap}>
        <button style={backBtn} onClick={() => setActiveTeam(null)}>
          Back To Teams
        </button>

        <section style={section}>
          <div style={teamHero}>
            {team.logo && <img src={team.logo} alt="" style={teamLogoLarge} />}
            <div>
              <h1 style={title}>{team.fullName}</h1>
              <div style={subtitle}>{activeTeam.division} • {teamPlayers.length} players</div>
            </div>
          </div>

          <div style={detailGrid}>
            <InfoCard title="Head Coach" value={getCoachName(activeTeam.coach_id)} />
            <InfoCard title="Assistant" value={getCoachName(activeTeam.assistant_coach_id)} />
            <InfoCard title="Team Rank" value={teamRanking.total} text={`Avg ${teamRanking.average} • ${teamRanking.count} players`} />
          </div>
        </section>

        <div style={actionBar}>
          <button style={primaryBtn} onClick={() => setShowAddPlayer(true)}>Add Player</button>
          <button style={primaryBtn} onClick={autoRoster}>Auto Roster</button>
        </div>

        {showAddPlayer && (
          <section style={section}>
            <div style={sectionTitle}>Add Player</div>
            <input
              placeholder="Search players..."
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              style={input}
            />

            <div style={list}>
              {players
                .filter((player) => (
                  !player.team_id &&
                  player.divisions?.name === activeTeam.division &&
                  `${player.first_name} ${player.last_name}`.toLowerCase().includes(playerSearch.toLowerCase())
                ))
                .map((player) => (
                  <div key={player.id} style={row}>
                    <span>{player.first_name} {player.last_name}</span>
                    <button style={smallDarkBtn} onClick={() => addPlayerToTeam(player.id)}>Add</button>
                  </div>
                ))}
            </div>

            <button style={secondaryBtn} onClick={() => setShowAddPlayer(false)}>Close</button>
          </section>
        )}

        <section style={section}>
          <div style={sectionTitle}>Roster</div>
          <div style={list}>
            {teamPlayers.map((player) => (
              <div key={player.id} style={row}>
                <div>
                  <div style={rowTitle}>{player.first_name} {player.last_name}</div>
                  <div style={rowSub}>Rating {getPlayerRating(player)}</div>
                </div>
                <button style={removeBtn} onClick={() => removeFromTeam(player.id)}>Remove</button>
              </div>
            ))}
          </div>
          {!teamPlayers.length && <div style={empty}>No players assigned to this team.</div>}
        </section>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div>
        <h1 style={title}>Team Manager</h1>
        <div style={subtitle}>
          Create teams, upload new logos, manage rosters, and review team ranking balance.
        </div>
      </div>

      <div style={toolGrid}>
        <ToolTile title="Overview" text="Season team summary" active={activeView === "overview"} onClick={() => setActiveView("overview")} />
        <ToolTile title="Create Team" text="Use an existing team or upload a new one" active={activeView === "create"} onClick={() => setActiveView("create")} />
        <ToolTile title="Manage Teams" text="Open rosters and team cards" active={activeView === "manage"} onClick={() => setActiveView("manage")} />
      </div>

      {status && (
        <div style={{ ...statusBox, ...(status.type === "error" ? errorBox : successBox) }}>
          {status.message}
        </div>
      )}

      {activeView === "overview" && (
        <>
          <div style={overviewGrid}>
            <OverviewTile title="Teams" value={totals.teams} text="Created teams" />
            <OverviewTile title="Divisions" value={totals.divisions} text="With teams assigned" />
            <OverviewTile title="Rostered" value={totals.rosteredPlayers} text="Players on teams" />
            <OverviewTile title="Unassigned" value={totals.unassignedPlayers} text="Players not on teams" />
          </div>

          <section style={section}>
            <div style={sectionTitle}>Teams By Division</div>
            <div style={sectionSub}>Open Manage Teams to work on rosters and coaching assignments.</div>
            <DivisionTeamGrid teamsByDivision={teamsByDivision} onOpen={setActiveTeam} getCoachName={getCoachName} />
          </section>
        </>
      )}

      {activeView === "create" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <div style={sectionTitle}>Create Team</div>
              <div style={sectionSub}>Select an existing template, or enter a new team name and upload a logo.</div>
            </div>
          </div>

          <div style={templateGrid}>
            {nflTeams.map((team) => (
              <button key={team.id} type="button" style={templateTile} onClick={() => selectTemplate(team)}>
                {getLogo(team) && <img src={getLogo(team)} alt="" style={templateLogo} />}
                <span>{team.full_name || team.short_name}</span>
              </button>
            ))}
          </div>

          <div style={formGrid}>
            <label style={fieldGroup}>
              <span style={label}>Team Name</span>
              <input
                style={input}
                value={teamForm.fullName}
                onChange={(e) => setTeamForm({ ...teamForm, fullName: e.target.value, nflTeamId: "" })}
                placeholder="Ravens"
              />
            </label>
            <label style={fieldGroup}>
              <span style={label}>Short Name</span>
              <input
                style={input}
                value={teamForm.shortName}
                onChange={(e) => setTeamForm({ ...teamForm, shortName: e.target.value, nflTeamId: "" })}
                placeholder="Ravens"
              />
            </label>
            <label style={fieldGroup}>
              <span style={label}>Division</span>
              <select
                style={input}
                value={teamForm.division}
                onChange={(e) => setTeamForm({ ...teamForm, division: e.target.value })}
              >
                <option value="">Select Division</option>
                {divisions.map((division) => (
                  <option key={division} value={division}>{division}</option>
                ))}
              </select>
            </label>
            <label style={fieldGroup}>
              <span style={label}>Head Coach</span>
              <select
                style={input}
                value={teamForm.coachId}
                onChange={(e) => setTeamForm({ ...teamForm, coachId: e.target.value })}
              >
                <option value="">Head Coach</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>{coach.first_name} {coach.last_name}</option>
                ))}
              </select>
            </label>
            <label style={fieldGroup}>
              <span style={label}>Assistant Coach</span>
              <select
                style={input}
                value={teamForm.assistantCoachId}
                onChange={(e) => setTeamForm({ ...teamForm, assistantCoachId: e.target.value })}
              >
                <option value="">Assistant Coach</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>{coach.first_name} {coach.last_name}</option>
                ))}
              </select>
            </label>
            <label style={fieldGroup}>
              <span style={label}>Logo Upload</span>
              <input
                style={input}
                type="file"
                accept="image/*"
                onChange={(e) => setTeamForm({ ...teamForm, logoFile: e.target.files?.[0] || null, nflTeamId: "" })}
              />
            </label>
          </div>

          <button style={primaryBtn} onClick={createTeam}>Create Team</button>
        </section>
      )}

      {activeView === "manage" && (
        <section style={section}>
          <div style={sectionTitle}>Manage Teams</div>
          <div style={sectionSub}>Open a team to manage roster, coaches, and player ranking totals.</div>
          <DivisionTeamGrid teamsByDivision={teamsByDivision} onOpen={setActiveTeam} getCoachName={getCoachName} />
        </section>
      )}
    </div>
  );
}

function DivisionTeamGrid({ teamsByDivision, onOpen, getCoachName }) {
  const entries = Object.entries(teamsByDivision);

  return (
    <div style={divisionList}>
      {entries.map(([division, teams]) => (
        <div key={division} style={divisionPanel}>
          <div style={divisionHeader}>{division}</div>
          <div style={teamGrid}>
            {teams.map((team) => (
              <button key={team.id} type="button" style={teamTile} onClick={() => onOpen(team)}>
                {team.logo && <img src={team.logo} alt="" style={teamLogo} />}
                <div style={teamName}>{team.fullName}</div>
                <div style={teamMeta}>Coach: {getCoachName(team.coach_id)}</div>
                <div style={teamMeta}>{team.players} players</div>
                <div style={rankBadge}>Rank {team.ranking.total} • Avg {team.ranking.average}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      {!entries.length && <div style={empty}>No teams have been created yet.</div>}
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

function InfoCard({ title, value, text }) {
  return (
    <div style={infoCard}>
      <div style={infoLabel}>{title}</div>
      <div style={infoValue}>{value}</div>
      {text && <div style={infoText}>{text}</div>}
    </div>
  );
}

async function uploadTeamLogo(file, teamName) {
  const safeName = (teamName || "team").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const extension = file.name.split(".").pop() || "png";
  const path = `${safeName}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("team-logos")
    .upload(path, file, { upsert: true });

  if (error) {
    return {
      ok: false,
      message: `Logo could not be uploaded: ${error.message}. Make sure the team-logos storage bucket exists and allows uploads.`,
    };
  }

  const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
  return { ok: true, url: data?.publicUrl || "" };
}

function getLogo(team) {
  if (!team) return null;
  if (team.logo && /^https?:\/\//i.test(team.logo)) return team.logo;

  const shortName = cleanTeamName(team.short_name).toLowerCase();
  const fullName = cleanTeamName(team.full_name).toLowerCase();
  if (shortName.includes("49") || fullName.includes("49")) return TEAM_LOGOS["49ers"];
  return TEAM_LOGOS[shortName] || TEAM_LOGOS[fullName] || null;
}

function getTeamRanking(teamId, players) {
  const teamPlayers = players.filter((player) => player.team_id === teamId);
  const total = teamPlayers.reduce((sum, player) => sum + getPlayerRating(player), 0);

  return {
    average: teamPlayers.length ? (total / teamPlayers.length).toFixed(1) : "0.0",
    count: teamPlayers.length,
    total,
  };
}

function getPlayerRating(player) {
  return Number(player.rating || player.rank_score || 3);
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function sortDivisions(a, b) {
  const order = ["K-1", "2nd-3rd", "4th-5th", "6th-8th", "Unassigned"];
  const indexA = order.indexOf(a || "Unassigned");
  const indexB = order.indexOf(b || "Unassigned");
  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
  }
  return String(a || "").localeCompare(String(b || ""));
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
const sectionHeader = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 };
const sectionTitle = { color: "#0f172a", fontSize: 18, fontWeight: 900 };
const sectionSub = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 4 };
const templateGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))", gap: 12, marginTop: 14 };
const templateTile = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, color: "#334155", cursor: "pointer", display: "flex", flexDirection: "column", fontSize: 12, fontWeight: 850, gap: 8, minHeight: 112, padding: 12, textAlign: "center" };
const templateLogo = { height: 48, objectFit: "contain", width: 48 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 18 };
const fieldGroup = { display: "grid", gap: 6 };
const label = { color: "#334155", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const input = { background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 10, boxSizing: "border-box", color: "#0f172a", minHeight: 42, padding: "9px 10px", width: "100%" };
const primaryBtn = { background: "#16a34a", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 900, marginTop: 14, minHeight: 42, padding: "10px 14px" };
const secondaryBtn = { background: "#e2e8f0", border: "none", borderRadius: 10, color: "#334155", cursor: "pointer", fontWeight: 850, marginTop: 12, padding: "9px 12px" };
const smallDarkBtn = { background: "#0f172a", border: "none", borderRadius: 9, color: "#fff", cursor: "pointer", fontWeight: 850, padding: "8px 10px" };
const removeBtn = { background: "#fee2e2", border: "none", borderRadius: 9, color: "#991b1b", cursor: "pointer", fontWeight: 850, padding: "8px 10px" };
const divisionList = { display: "grid", gap: 16, marginTop: 14 };
const divisionPanel = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 };
const divisionHeader = { color: "#0f172a", fontSize: 17, fontWeight: 900, marginBottom: 12 };
const teamGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 };
const teamTile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, cursor: "pointer", padding: 14, textAlign: "center" };
const teamLogo = { height: 52, objectFit: "contain", width: 52 };
const teamLogoLarge = { height: 92, objectFit: "contain", width: 92 };
const teamName = { color: "#0f172a", fontSize: 14, fontWeight: 900, marginTop: 8 };
const teamMeta = { color: "#64748b", fontSize: 11, fontWeight: 750, marginTop: 5 };
const rankBadge = { background: "#ecfdf3", borderRadius: 999, color: "#166534", display: "inline-block", fontSize: 11, fontWeight: 900, marginTop: 8, padding: "5px 8px" };
const statusBox = { borderRadius: 10, fontSize: 13, fontWeight: 800, padding: "10px 12px" };
const successBox = { background: "#dcfce7", color: "#166534" };
const errorBox = { background: "#fee2e2", color: "#991b1b" };
const empty = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 14, textAlign: "center" };
const backBtn = { alignSelf: "flex-start", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, color: "#334155", cursor: "pointer", fontWeight: 850, padding: "9px 12px" };
const teamHero = { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 16 };
const detailGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginTop: 16 };
const infoCard = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 };
const infoLabel = { color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const infoValue = { color: "#0f172a", fontSize: 20, fontWeight: 950, marginTop: 4 };
const infoText = { color: "#64748b", fontSize: 12, fontWeight: 750, marginTop: 3 };
const actionBar = { display: "flex", flexWrap: "wrap", gap: 10 };
const list = { display: "grid", gap: 8, marginTop: 12 };
const row = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, display: "flex", gap: 10, justifyContent: "space-between", padding: 12 };
const rowTitle = { color: "#0f172a", fontWeight: 900 };
const rowSub = { color: "#64748b", fontSize: 12, fontWeight: 750, marginTop: 2 };
