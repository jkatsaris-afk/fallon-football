import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";

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
  Bills: bills,
  Bengals: bengals,
  Broncos: broncos,
  Lions: lions,
  Colts: colts,
  Chiefs: chiefs,
  Raiders: raiders,
  Rams: rams,
  Jets: jets,
  Eagles: eagles,
  Steelers: steelers,
  Ravens: ravens,
  "49ers": niners,
};

export default function CoachRankingsPage() {
  const [settings, setSettings] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [ratings, setRatings] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    setSettings(settingsData || { coach_rankings_open: false });

    const { data: coachData } = await supabase
      .from("coaches")
      .select("id, first_name, last_name, status")
      .order("last_name", { ascending: true });

    const { data: teamData } = await supabase
      .from("teams")
      .select("id, nfl_team_id, division, coach_id, assistant_coach_id");

    const { data: nflData } = await supabase
      .from("nfl_teams")
      .select("id, short_name, full_name");

    const { data: playerData } = await supabase
      .from("players")
      .select("id, first_name, last_name, age, team_id, rating, rank_score")
      .order("last_name", { ascending: true });

    setCoaches((coachData || []).filter((coach) => (coach.status || "approved") === "approved"));
    setTeams(teamData || []);
    setNflTeams(nflData || []);
    setPlayers(playerData || []);

    const nextRatings = {};
    (playerData || []).forEach((player) => {
      nextRatings[player.id] = Number(player.rating || player.rank_score || 3);
    });
    setRatings(nextRatings);
  };

  const selectedTeam = useMemo(() => (
    teams.find((team) => (
      team.coach_id === selectedCoachId ||
      team.assistant_coach_id === selectedCoachId
    ))
  ), [teams, selectedCoachId]);

  const selectedCoach = coaches.find((coach) => coach.id === selectedCoachId);
  const nflTeam = nflTeams.find((team) => team.id === selectedTeam?.nfl_team_id);
  const teamPlayers = players.filter((player) => player.team_id === selectedTeam?.id);
  const teamLogo = TEAM_LOGOS[nflTeam?.short_name] || null;

  const hasChanges = teamPlayers.some((player) => (
    Number(ratings[player.id] || 3) !== Number(player.rating || player.rank_score || 3)
  ));

  const setPlayerRating = (playerId, value) => {
    setRatings((current) => ({
      ...current,
      [playerId]: value,
    }));
  };

  const saveRatings = async () => {
    setSaving(true);
    setStatus(null);

    try {
      const changedPlayers = teamPlayers.filter((player) => (
        Number(ratings[player.id] || 3) !== Number(player.rating || player.rank_score || 3)
      ));

      for (const player of changedPlayers) {
        const rating = Number(ratings[player.id] || 3);
        const { error } = await supabase
          .from("players")
          .update({
            rating,
            rank_score: rating,
          })
          .eq("id", player.id);

        if (error) throw error;
      }

      setStatus({ type: "success", message: "Player rankings saved." });
      await loadData();
    } catch (err) {
      console.error("Ranking save failed:", err);
      setStatus({ type: "error", message: "Could not save rankings. Please try again." });
    }

    setSaving(false);
  };

  return (
    <div style={wrap}>
      <div style={hero}>
        <div>
          <h1 style={title}>Coach Player Rankings</h1>
          <div style={subtitle}>
            Select your name, review your roster, and rank each player from 1 to 5.
          </div>
        </div>
      </div>

      {settings && !settings.coach_rankings_open && (
        <div style={closedCard}>
          <div style={closedTitle}>Coach rankings are closed</div>
          <div style={closedText}>
            The league will open this form when it is time to submit player rankings.
          </div>
        </div>
      )}

      {settings?.coach_rankings_open && (
        <>

      <div style={panel}>
        <label style={fieldGroup}>
          <span style={fieldLabel}>Coach</span>
          <select
            value={selectedCoachId}
            onChange={(e) => {
              setSelectedCoachId(e.target.value);
              setStatus(null);
            }}
            style={select}
          >
            <option value="">Select your name</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.first_name} {coach.last_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedCoachId && !selectedTeam && (
        <div style={empty}>
          No team is assigned to {selectedCoach?.first_name} {selectedCoach?.last_name} yet.
        </div>
      )}

      {selectedTeam && (
        <div style={panel}>
          <div style={teamHeader}>
            {teamLogo && <img src={teamLogo} alt="" style={teamLogoStyle} />}
            <div>
              <div style={teamName}>{nflTeam?.full_name || "Assigned Team"}</div>
              <div style={teamMeta}>{selectedTeam.division} • {teamPlayers.length} players</div>
            </div>
          </div>

          {!teamPlayers.length && (
            <div style={emptyInline}>No players are currently assigned to this team.</div>
          )}

          <div style={playerList}>
            {teamPlayers.map((player) => (
              <div key={player.id} style={playerCard}>
                <div>
                  <div style={playerName}>{player.first_name} {player.last_name}</div>
                  <div style={playerMeta}>Age {player.age || "—"}</div>
                </div>

                <div style={ratingGroup}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      style={{
                        ...ratingBtn,
                        ...(Number(ratings[player.id] || 3) === value ? activeRatingBtn : {}),
                      }}
                      onClick={() => setPlayerRating(player.id, value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            style={{
              ...saveBtn,
              ...(!hasChanges || saving ? disabledBtn : {}),
            }}
            disabled={!hasChanges || saving}
            onClick={saveRatings}
          >
            {saving ? "Saving..." : "Save Rankings"}
          </button>

          {status && (
            <div style={{
              ...statusBox,
              ...(status.type === "error" ? errorBox : successBox),
            }}>
              {status.message}
            </div>
          )}
        </div>
      )}

        </>
      )}
    </div>
  );
}

const wrap = { display: "flex", flexDirection: "column", gap: 16, padding: 20 };
const hero = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 20 };
const title = { color: "#0f172a", fontSize: 26, fontWeight: 900, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 14, marginTop: 6 };
const panel = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 18 };
const closedCard = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", padding: 22, textAlign: "center" };
const closedTitle = { color: "#0f172a", fontSize: 20, fontWeight: 900 };
const closedText = { color: "#64748b", fontSize: 14, marginTop: 6 };
const fieldGroup = { display: "flex", flexDirection: "column", gap: 6 };
const fieldLabel = { color: "#475569", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const select = { border: "1px solid #cbd5e1", borderRadius: 10, fontSize: 15, padding: 12 };
const empty = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,0.08)", color: "#64748b", padding: 18, textAlign: "center" };
const emptyInline = { color: "#64748b", marginTop: 14 };
const teamHeader = { alignItems: "center", display: "flex", gap: 14, marginBottom: 14 };
const teamLogoStyle = { height: 56, objectFit: "contain", width: 56 };
const teamName = { color: "#0f172a", fontSize: 20, fontWeight: 900 };
const teamMeta = { color: "#64748b", fontSize: 13, fontWeight: 800, marginTop: 3 };
const playerList = { display: "flex", flexDirection: "column", gap: 10 };
const playerCard = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, display: "flex", gap: 12, justifyContent: "space-between", padding: 12, flexWrap: "wrap" };
const playerName = { color: "#0f172a", fontWeight: 900 };
const playerMeta = { color: "#64748b", fontSize: 12, marginTop: 2 };
const ratingGroup = { display: "flex", gap: 6 };
const ratingBtn = { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, color: "#334155", cursor: "pointer", fontWeight: 900, height: 38, width: 38 };
const activeRatingBtn = { background: "#16a34a", borderColor: "#16a34a", color: "#fff" };
const saveBtn = { background: "#2f6ea6", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 900, marginTop: 14, padding: "12px 16px", width: "100%" };
const disabledBtn = { cursor: "not-allowed", opacity: 0.5 };
const statusBox = { borderRadius: 10, fontSize: 13, fontWeight: 800, marginTop: 12, padding: 10 };
const successBox = { background: "#dcfce7", color: "#166534" };
const errorBox = { background: "#fee2e2", color: "#991b1b" };
