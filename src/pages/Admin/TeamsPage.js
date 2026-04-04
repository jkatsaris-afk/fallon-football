import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

// ===== LOGOS =====
import sf from "../../resources/San Francisco 49ers.png";
import bengals from "../../resources/Cincinnati Bengals.png";
import bills from "../../resources/Buffalo Bills.png";
import broncos from "../../resources/Denver Broncos.png";
import chiefs from "../../resources/Kansas City Chiefs.png";
import colts from "../../resources/Indianapolis Colts.png";
import eagles from "../../resources/Philadelphia Eagles.png";
import jets from "../../resources/New York Jets.png";
import lions from "../../resources/Detroit Lions.png";
import raiders from "../../resources/Las Vegas Raiders.png";
import rams from "../../resources/Los Angeles Rams.png";
import steelers from "../../resources/Pittsburgh Steelers.png";

// ===== MAP =====
const logos = {
  "49ers": sf,
  "Bengals": bengals,
  "Bills": bills,
  "Broncos": broncos,
  "Chiefs": chiefs,
  "Colts": colts,
  "Eagles": eagles,
  "Jets": jets,
  "Lions": lions,
  "Raiders": raiders,
  "Rams": rams,
  "Steelers": steelers,
};

function getLogo(name) {
  return logos[name] || null;
}

export default function TeamsPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    // divisions
    const { data: divisions } = await supabase
      .from("divisions")
      .select("*");

    // teams
    const { data: teams } = await supabase
      .from("teams")
      .select("*");

    // coaches
    const { data: coaches } = await supabase
      .from("coaches")
      .select("*");

    // team_coaches
    const { data: links } = await supabase
      .from("team_coaches")
      .select("*");

    // players
    const { data: players } = await supabase
      .from("players")
      .select("*");

    // ===== BUILD STRUCTURE =====
    const structured = divisions.map(d => {
      const divisionTeams = teams
        .filter(t => t.division_id === d.id)
        .map(team => {
          const coachLinks = links.filter(l => l.team_id === team.id);

          const teamCoaches = coachLinks.map(l =>
            coaches.find(c => c.id === l.coach_id)
          );

          const teamPlayers = players.filter(p => p.team_id === team.id);

          return {
            ...team,
            coaches: teamCoaches,
            players: teamPlayers,
          };
        });

      return {
        ...d,
        teams: divisionTeams,
      };
    });

    setData(structured);
  }

  return (
    <div style={container}>
      <h1 style={{ marginBottom: 20 }}>Teams</h1>

      {data.map((division) => (
        <div key={division.id} style={{ marginBottom: 30 }}>
          <h2 style={divisionTitle}>{division.name}</h2>

          <div style={teamGrid}>
            {division.teams.map((team) => (
              <div key={team.id} style={teamCard}>

                {/* LOGO + NAME */}
                <div style={teamHeader}>
                  {getLogo(team.name) && (
                    <img src={getLogo(team.name)} style={logo} />
                  )}
                  <div style={teamName}>{team.name}</div>
                </div>

                {/* COACHES */}
                <div style={section}>
                  <div style={sectionTitle}>Coach</div>
                  {team.coaches.map((c, i) => (
                    <div key={i} style={text}>
                      {c?.name} {c?.phone && `• ${c.phone}`}
                    </div>
                  ))}
                </div>

                {/* PLAYERS */}
                <div style={section}>
                  <div style={sectionTitle}>Players ({team.players.length})</div>

                  {team.players.length === 0 && (
                    <div style={sub}>No players yet</div>
                  )}

                  {team.players.map((p) => (
                    <div key={p.id} style={text}>
                      {p.name}
                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== STYLES ===== */

const container = {
  padding: 20,
  overflowY: "auto",
};

const divisionTitle = {
  marginBottom: 10,
};

const teamGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 15,
};

const teamCard = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 15,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
};

const teamHeader = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
};

const teamName = {
  fontSize: 18,
  fontWeight: "600",
};

const logo = {
  width: 28,
  height: 28,
};

const section = {
  marginTop: 10,
};

const sectionTitle = {
  fontSize: 12,
  color: "#64748b",
  marginBottom: 4,
};

const text = {
  fontSize: 13,
};

const sub = {
  fontSize: 12,
  color: "#94a3b8",
};
