import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

export default function ChampionshipMatchupsPage() {
  const [scores, setScores] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [eliminationType, setEliminationType] = useState("single");
  const [matchupDrafts, setMatchupDrafts] = useState({});
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: scoreData } = await supabase.from("game_scores").select("*");
    const { data: scheduleData } = await supabase
      .from("schedule_master_auto")
      .select("id, division, event_type");

    setScores(scoreData || []);
    setSchedule(scheduleData || []);
  };

  const scheduleById = useMemo(() => {
    const map = {};
    schedule.forEach((game) => {
      map[game.id] = game;
    });
    return map;
  }, [schedule]);

  const standings = useMemo(() => {
    const map = {};

    scores.forEach((score) => {
      const game = scheduleById[score.schedule_id];
      if (!game || (game.event_type || "").toLowerCase().includes("champ")) return;

      const division = normalizeDivision(game.division);
      const rows = [
        {
          team: score.home_team,
          scored: Number(score.home_score || 0),
          allowed: Number(score.away_score || 0),
        },
        {
          team: score.away_team,
          scored: Number(score.away_score || 0),
          allowed: Number(score.home_score || 0),
        },
      ];

      rows.forEach((row) => {
        if (!row.team) return;
        const key = `${division}-${row.team}`;

        if (!map[key]) {
          map[key] = {
            division,
            team: row.team,
            wins: 0,
            losses: 0,
            ties: 0,
            pf: 0,
            pa: 0,
          };
        }

        map[key].pf += row.scored;
        map[key].pa += row.allowed;

        if (row.scored > row.allowed) map[key].wins += 1;
        else if (row.scored < row.allowed) map[key].losses += 1;
        else map[key].ties += 1;
      });
    });

    return Object.values(map).sort((a, b) => {
      if (a.division !== b.division) return a.division.localeCompare(b.division);
      if (b.wins !== a.wins) return b.wins - a.wins;
      const diffA = a.pf - a.pa;
      const diffB = b.pf - b.pa;
      if (diffB !== diffA) return diffB - diffA;
      if (b.pf !== a.pf) return b.pf - a.pf;
      return a.team.localeCompare(b.team);
    });
  }, [scores, scheduleById]);

  const scoreByScheduleId = useMemo(() => {
    const map = {};
    scores.forEach((score) => {
      if (
        score.schedule_id &&
        score.home_score !== null &&
        score.home_score !== undefined &&
        score.away_score !== null &&
        score.away_score !== undefined
      ) {
        map[score.schedule_id] = score;
      }
    });
    return map;
  }, [scores]);

  const regularGameStatus = useMemo(() => {
    const regularGames = schedule.filter(isRegularSeasonGame);
    const scoredGames = regularGames.filter((game) => scoreByScheduleId[game.id]);

    return {
      total: regularGames.length,
      scored: scoredGames.length,
      missing: Math.max(regularGames.length - scoredGames.length, 0),
      ready: regularGames.length > 0 && regularGames.length === scoredGames.length,
    };
  }, [schedule, scoreByScheduleId]);

  const visibleDivisions = useMemo(() => {
    const seededDivisions = [...new Set(standings.map((row) => row.division).filter(Boolean))]
      .sort(sortDivisions);

    return ["all", ...seededDivisions];
  }, [standings]);

  useEffect(() => {
    if (selectedDivision !== "all" && !visibleDivisions.includes(selectedDivision)) {
      setSelectedDivision("all");
    }
  }, [selectedDivision, visibleDivisions]);

  const grouped = useMemo(() => {
    const map = {};
    standings.forEach((row) => {
      if (selectedDivision !== "all" && row.division !== selectedDivision) return;
      if (!map[row.division]) map[row.division] = [];
      map[row.division].push(row);
    });

    Object.keys(map).forEach((division) => {
      map[division] = map[division].map((row, index) => ({
        ...row,
        seed: index + 1,
      }));
    });

    return map;
  }, [standings, selectedDivision]);

  const plannerUnlocked = regularGameStatus.ready || manualOverride;

  const addMatchup = (division, rows) => {
    setMatchupDrafts((current) => ({
      ...current,
      [division]: [
        ...(current[division] || []),
        {
          homeParticipant: rows[0] ? getSeedValue(rows[0].seed) : "",
          awayParticipant: rows[1] ? getSeedValue(rows[1].seed) : "",
          winnerParticipant: "",
        },
      ],
    }));
  };

  const updateMatchup = (division, index, field, value) => {
    setMatchupDrafts((current) => ({
      ...current,
      [division]: (current[division] || []).map((matchup, matchupIndex) => (
        matchupIndex === index ? { ...matchup, [field]: value } : matchup
      )),
    }));
  };

  const removeMatchup = (division, index) => {
    setMatchupDrafts((current) => ({
      ...current,
      [division]: (current[division] || []).filter((_, matchupIndex) => matchupIndex !== index),
    }));
  };

  const createSuggestedMatchups = (division, rows) => {
    const suggestions = [];
    for (let left = 0, right = rows.length - 1; left < right; left += 1, right -= 1) {
      suggestions.push({
        homeParticipant: getSeedValue(rows[left].seed),
        awayParticipant: getSeedValue(rows[right].seed),
        winnerParticipant: "",
      });
    }

    setMatchupDrafts((current) => ({
      ...current,
      [division]: suggestions,
    }));
  };

  return (
    <div style={wrap}>
      <div>
        <h2 style={title}>Championship Seeding</h2>
        <div style={subtitle}>
          Current seeds are calculated by wins, point differential, points for, then team name.
        </div>
      </div>

      <div style={statusPanel}>
        <div>
          <div style={statusTitle}>
            Regular season scoring: {regularGameStatus.scored} of {regularGameStatus.total} games complete
          </div>
          <div style={statusText}>
            {plannerUnlocked && manualOverride && !regularGameStatus.ready
              ? `Override is on. ${regularGameStatus.missing} unscored game${regularGameStatus.missing === 1 ? "" : "s"} will be ignored for matchup planning.`
              : regularGameStatus.ready
              ? "All regular season games are scored. Matchup planning is unlocked."
              : `${regularGameStatus.missing} game${regularGameStatus.missing === 1 ? "" : "s"} still need scores before matchup planning opens.`}
          </div>
        </div>

        <div style={eliminationControl}>
          <button
            type="button"
            style={{
              ...toggleBtn,
              ...(eliminationType === "single" ? activeToggleBtn : {}),
              ...(!plannerUnlocked ? disabledBtn : {}),
            }}
            disabled={!plannerUnlocked}
            onClick={() => setEliminationType("single")}
          >
            Single Elimination
          </button>
          <button
            type="button"
            style={{
              ...toggleBtn,
              ...(eliminationType === "double" ? activeToggleBtn : {}),
              ...(!plannerUnlocked ? disabledBtn : {}),
            }}
            disabled={!plannerUnlocked}
            onClick={() => setEliminationType("double")}
          >
            Double Elimination
          </button>
          {!regularGameStatus.ready && (
            <button
              type="button"
              style={{
                ...overrideBtn,
                ...(manualOverride ? activeOverrideBtn : {}),
              }}
              onClick={() => setManualOverride((current) => !current)}
            >
              {manualOverride ? "Override On" : "Override Missing Games"}
            </button>
          )}
        </div>
      </div>

      <div style={filterGrid}>
        {visibleDivisions.map((division) => (
          <button
            key={division}
            style={{
              ...filterTile,
              ...(selectedDivision === division ? activeFilterTile : {}),
            }}
            onClick={() => setSelectedDivision(division)}
          >
            {division === "all" ? "All Divisions" : division}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 && (
        <div style={empty}>No completed game scores available for seeding yet.</div>
      )}

      {Object.entries(grouped).map(([division, rows]) => {
        const divisionDrafts = matchupDrafts[division] || [];

        return (
          <section key={division} style={section}>
            <div style={sectionHeader}>
              <div>
                <div style={divisionTitle}>{division}</div>
                <div style={sectionSub}>{rows.length} seeded teams</div>
              </div>
            </div>

            <div style={seedGrid}>
              {rows.map((row) => (
                <div key={row.team} style={seedCard}>
                  <div style={seedBadge}>Seed {row.seed}</div>
                  <div style={teamName}>{row.team}</div>
                  <div style={record}>{row.wins}-{row.losses}{row.ties ? `-${row.ties}` : ""}</div>
                  <div style={metricRow}>
                    <span>PF {row.pf}</span>
                    <span>PA {row.pa}</span>
                    <span>DIFF {row.pf - row.pa}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              ...matchupPanel,
              ...(!plannerUnlocked ? lockedPanel : {}),
              ...(manualOverride && !regularGameStatus.ready ? overridePanel : {}),
            }}>
              <div style={matchupHeader}>
                <div>
                  <div style={matchupTitle}>Seed Matchup Planner</div>
                  <div style={sectionSub}>
                    {plannerUnlocked
                      ? `${eliminationType === "single" ? "Single" : "Double"} elimination selected`
                      : "Locked until every regular season game has a score"}
                  </div>
                </div>

                <div style={matchupActions}>
                  <button
                    type="button"
                    style={{ ...smallBtn, ...(!plannerUnlocked ? disabledBtn : {}) }}
                    disabled={!plannerUnlocked}
                    onClick={() => createSuggestedMatchups(division, rows)}
                  >
                    Suggest Seeds
                  </button>
                  <button
                    type="button"
                    style={{ ...smallBtn, ...(!plannerUnlocked ? disabledBtn : {}) }}
                    disabled={!plannerUnlocked}
                    onClick={() => addMatchup(division, rows)}
                  >
                    Add Matchup
                  </button>
                </div>
              </div>

              {plannerUnlocked && divisionDrafts.length === 0 && (
                <div style={plannerEmpty}>No seed matchups selected yet.</div>
              )}

              {divisionDrafts.map((matchup, index) => (
                <MatchupPlannerRow
                  key={`${division}-${index}`}
                  index={index}
                  matchup={matchup}
                  rows={rows}
                  divisionDrafts={divisionDrafts}
                  updateMatchup={(field, value) => updateMatchup(division, index, field, value)}
                  removeMatchup={() => removeMatchup(division, index)}
                />
              ))}

              {plannerUnlocked && eliminationType === "double" && (
                <div style={doubleNote}>
                  Double elimination selected. Build the opening seed matchups here, then use the results to schedule the winners and elimination brackets.
                </div>
              )}

              {manualOverride && !regularGameStatus.ready && (
                <div style={overrideNote}>
                  Override active. Current seeds only include games that already have scores.
                </div>
              )}

              {!plannerUnlocked && (
                <div style={plannerEmpty}>
                  Finish entering regular season scores to choose seed matchups.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const wrap = { display: "flex", flexDirection: "column", gap: 18 };
const title = { fontSize: 24, fontWeight: 800, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 13, marginTop: 4 };
const filterGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 10 };
const filterTile = { background: "#fff", border: "none", borderRadius: 12, padding: 12, cursor: "pointer", fontWeight: 700 };
const activeFilterTile = { outline: "2px solid #16a34a" };
const empty = { background: "#fff", borderRadius: 12, color: "#64748b", padding: 18, textAlign: "center" };
const section = { background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", padding: 18 };
const sectionHeader = { display: "flex", justifyContent: "space-between", marginBottom: 12 };
const divisionTitle = { fontSize: 20, fontWeight: 800 };
const sectionSub = { color: "#64748b", fontSize: 12 };
const seedGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12 };
const seedCard = { background: "#f8fafc", borderRadius: 12, padding: 12 };
const seedBadge = { color: "#166534", fontSize: 12, fontWeight: 800 };
const teamName = { fontWeight: 800, marginTop: 4 };
const record = { fontSize: 18, fontWeight: 800, marginTop: 4 };
const metricRow = { color: "#64748b", display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, marginTop: 6 };
const statusPanel = { alignItems: "center", background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", display: "flex", gap: 14, justifyContent: "space-between", padding: 16, flexWrap: "wrap" };
const statusTitle = { fontSize: 16, fontWeight: 800 };
const statusText = { color: "#64748b", fontSize: 13, marginTop: 4 };
const eliminationControl = { display: "flex", gap: 8, flexWrap: "wrap" };
const toggleBtn = { background: "#f8fafc", border: "1px solid #d1d5db", borderRadius: 10, color: "#334155", cursor: "pointer", fontWeight: 800, padding: "9px 12px" };
const activeToggleBtn = { background: "#dcfce7", borderColor: "#16a34a", color: "#166534" };
const disabledBtn = { cursor: "not-allowed", opacity: 0.5 };
const overrideBtn = { background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, color: "#9a3412", cursor: "pointer", fontWeight: 800, padding: "9px 12px" };
const activeOverrideBtn = { background: "#fb923c", borderColor: "#ea580c", color: "#fff" };
const matchupPanel = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, marginTop: 14, padding: 14 };
const lockedPanel = { background: "#f1f5f9" };
const overridePanel = { borderColor: "#fdba74" };
const matchupHeader = { alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap" };
const matchupTitle = { fontWeight: 800 };
const matchupActions = { display: "flex", gap: 8, flexWrap: "wrap" };
const smallBtn = { background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, color: "#111827", cursor: "pointer", fontWeight: 800, padding: "8px 10px" };
const plannerEmpty = { color: "#64748b", fontSize: 13, marginTop: 12 };
const matchupRow = { alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 };
const seedSelect = { background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, minWidth: 0, padding: "9px 10px", width: "100%" };
const vsText = { color: "#64748b", fontSize: 12, fontWeight: 800 };
const removeBtn = { background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, color: "#be123c", cursor: "pointer", fontWeight: 800, padding: "8px 10px" };
const doubleNote = { background: "#fff7ed", borderRadius: 10, color: "#9a3412", fontSize: 12, fontWeight: 700, marginTop: 12, padding: 10 };
const overrideNote = { background: "#fffbeb", borderRadius: 10, color: "#92400e", fontSize: 12, fontWeight: 800, marginTop: 12, padding: 10 };
const gameLabel = { color: "#334155", flex: "0 0 70px", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const participantCell = { flex: "1 1 180px", minWidth: 0 };
const winnerCell = { display: "flex", flex: "1 1 190px", flexDirection: "column", gap: 4, minWidth: 0 };
const winnerLabel = { color: "#64748b", fontSize: 11, fontWeight: 800 };
const resolvedText = { color: "#166534", flex: "1 0 100%", fontSize: 12, fontWeight: 800, marginTop: 2 };

function MatchupPlannerRow({
  index,
  matchup,
  rows,
  divisionDrafts,
  updateMatchup,
  removeMatchup,
}) {
  const participantOptions = buildParticipantOptions(rows, divisionDrafts, index);
  const winnerOptions = buildWinnerOptions(matchup, rows, divisionDrafts);

  return (
    <div style={matchupRow}>
      <div style={gameLabel}>Game {index + 1}</div>

      <div style={participantCell}>
        <select
          value={matchup.homeParticipant || ""}
          onChange={(e) => updateMatchup("homeParticipant", e.target.value)}
          style={seedSelect}
        >
          <option value="">Team / placeholder</option>
          {participantOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <span style={vsText}>vs</span>

      <div style={participantCell}>
        <select
          value={matchup.awayParticipant || ""}
          onChange={(e) => updateMatchup("awayParticipant", e.target.value)}
          style={seedSelect}
        >
          <option value="">Team / placeholder</option>
          {participantOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={winnerCell}>
        <span style={winnerLabel}>Winner moves on</span>
        <select
          value={matchup.winnerParticipant || ""}
          onChange={(e) => updateMatchup("winnerParticipant", e.target.value)}
          style={seedSelect}
        >
          <option value="">Waiting for result</option>
          {winnerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button type="button" style={removeBtn} onClick={removeMatchup}>
        Remove
      </button>

      {matchup.winnerParticipant && (
        <div style={resolvedText}>
          Winner of Game {index + 1}: {resolveParticipantLabel(matchup.winnerParticipant, rows, divisionDrafts)}
        </div>
      )}
    </div>
  );
}

function buildParticipantOptions(rows, divisionDrafts, currentIndex) {
  const seedOptions = rows.map((row) => ({
    value: getSeedValue(row.seed),
    label: `#${row.seed} ${row.team}`,
  }));

  const winnerOptions = divisionDrafts
    .slice(0, currentIndex)
    .map((_, index) => ({
      value: getWinnerValue(index),
      label: `Winner of Game ${index + 1}`,
    }));

  return [...seedOptions, ...winnerOptions];
}

function buildWinnerOptions(matchup, rows, divisionDrafts) {
  const values = [matchup.homeParticipant, matchup.awayParticipant].filter(Boolean);
  return values.map((value) => ({
    value,
    label: resolveParticipantLabel(value, rows, divisionDrafts),
  }));
}

function resolveParticipantLabel(value, rows, divisionDrafts) {
  if (!value) return "";

  if (value.startsWith("seed:")) {
    const seed = Number(value.replace("seed:", ""));
    const row = rows.find((item) => item.seed === seed);
    return row ? `#${row.seed} ${row.team}` : `Seed ${seed}`;
  }

  if (value.startsWith("winner:")) {
    const index = Number(value.replace("winner:", ""));
    const source = divisionDrafts[index];
    if (source?.winnerParticipant) {
      return resolveParticipantLabel(source.winnerParticipant, rows, divisionDrafts);
    }
    return `Winner of Game ${index + 1}`;
  }

  return value;
}

function getSeedValue(seed) {
  return `seed:${seed}`;
}

function getWinnerValue(index) {
  return `winner:${index}`;
}

function isRegularSeasonGame(game) {
  const eventType = (game.event_type || "").toLowerCase();
  if (eventType.includes("champ")) return false;
  if (eventType.includes("practice")) return false;
  return true;
}

function normalizeDivision(value) {
  const division = (value || "").trim();
  if (!division) return "Unassigned";

  const compact = division.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (compact === "k1" || compact === "k1st" || compact === "kindergarten1st") return "K-1";
  if (compact === "23" || compact === "2nd3rd" || compact === "2nd3" || compact === "23rd") return "2nd-3rd";
  if (compact === "45" || compact === "4th5th" || compact === "4th5" || compact === "45th") return "4th-5th";
  if (compact === "68" || compact === "6th8th" || compact === "6th8" || compact === "678" || compact === "6th7th8th") return "6th-8th";

  return division;
}

function sortDivisions(a, b) {
  const order = ["K-1", "2nd-3rd", "4th-5th", "6th-8th", "Unassigned"];
  const indexA = order.indexOf(a);
  const indexB = order.indexOf(b);

  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
  }

  return a.localeCompare(b);
}
