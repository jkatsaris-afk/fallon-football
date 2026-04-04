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
  const [teams, setTeams] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: divisions } = await supabase.from("divisions").select("*");
    const { data: t } = await supabase.from("teams").select("*");
    const { data: coaches } = await supabase.from("coaches").select("*");
    const { data: links } = await supabase.from("team_coaches").select("*");
    const { data: players } = await supabase.from("players").select("*");

    const built = t.map(team => {
      const division = divisions.find(d => d.id === team.division_id);

      const teamLinks = links.filter(l => l.team_id === team.id);

      const teamCoaches = teamLinks.map(l =>
        coaches.find(c => c.id === l.coach_id)
      );

      const teamPlayers = players.filter(p => p.team_id === team.id);

      return {
        ...team,
        division: division?.name,
        coaches: teamCoaches,
        players: teamPlayers
      };
    });

    setTeams(built);
  }

  return (
    <div style={container}>

      <h1 style={{ marginBottom: 20 }}>Teams</h1>

      <div style={grid}>
        {teams.map(team => (
          <div
            key={team.id}
            style={card}
            onClick={() =>
              setExpanded(expanded === team.id ? null : team.id)
            }
          >

            {/* HEADER */}
            <div style={header}>
              {getLogo(team.name) && (
                <img src={getLogo(team.name)} style={logo} />
              )}
              <div>
                <div style={teamName}>{team.name}</div>
                <div style={division}>{team.division}</div>
              </div>
            </div>

            {/* COACH */}
            <div style={coach}>
              {team.coaches.map(c => c?.name).join(", ") || "No coach"}
            </div>

            {/* EXPANDED PLAYERS */}
            {expanded === team.id && (
              <div style={players}>
                <div style={playerHeader}>Players</div>

                {team.players.length === 0 && (
                  <div style={empty}>No players</div>
                )}

                {team.players.map(p => (
                  <div key={p.id} style={player}>
                    {p.name}
                  </div>
                ))}
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
}

/* ===== STYLES ===== */

const container = {
  padding: 20,
  overflowY: "auto"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 15
};

const card = {
  background: "#ffffff",
  borderRadius: 16,
  padding: 15,
  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  cursor: "pointer",
  transition: "0.2s"
};

const header = {
  display: "flex",
  alignItems: "center",
  gap: 10
};

const logo = {
  width: 32,
  height: 32
};

const teamName = {
  fontWeight: "600",
  fontSize: 16
};

const division = {
  fontSize: 12,
  color: "#64748b"
};

const coach = {
  marginTop: 10,
  fontSize: 13
};

const players = {
  marginTop: 12,
  borderTop: "1px solid #e5e7eb",
  paddingTop: 10
};

const playerHeader = {
  fontSize: 12,
  color: "#64748b",
  marginBottom: 5
};

const player = {
  fontSize: 13,
  padding: "2px 0"
};

const empty = {
  fontSize: 12,
  color: "#94a3b8"
};
