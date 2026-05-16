import React, { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { supabase } from "../../../supabase";
import { applyPersonSeasonFilter, applyUuidSeasonFilter, getActiveSeason } from "../../../utils/season";

export default function ChampionshipMatchupsPage() {
  const [scores, setScores] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [fields, setFields] = useState([]);
  const [fieldTimeBlocks, setFieldTimeBlocks] = useState([]);
  const [championshipSchedule, setChampionshipSchedule] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [eliminationType, setEliminationType] = useState("single");
  const [matchupDrafts, setMatchupDrafts] = useState({});
  const [manualOverride, setManualOverride] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState(null);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const active = await getActiveSeason();
    const { data: scoreData } = await supabase.from("game_scores").select("*");
    const { data: scheduleData } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("id, division, event_type"), active);
    const { data: teamData } = await applyPersonSeasonFilter(supabase
      .from("teams")
      .select("id, division, nfl_team_id"), active);
    const { data: nflTeamData } = await supabase
      .from("nfl_teams")
      .select("id, short_name, full_name");
    const { data: playerData } = await applyPersonSeasonFilter(supabase
      .from("players")
      .select("id, team_id, rating, rank_score"), active);
    const { data: fieldData } = await supabase
      .from("fields")
      .select("*")
      .eq("is_active", true)
      .order("field_number", { ascending: true });
    const { data: blockData } = await supabase
      .from("field_time_blocks")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const { data: championshipRows } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%champ%")
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true }), active);

    const currentScheduleIds = new Set((scheduleData || []).map((game) => game.id));
    setScores(dedupeScoresByScheduleId((scoreData || []).filter((score) => currentScheduleIds.has(score.schedule_id))));
    setSchedule(scheduleData || []);
    setTeams(teamData || []);
    setNflTeams(nflTeamData || []);
    setPlayers(playerData || []);
    setFields(fieldData || []);
    setFieldTimeBlocks(blockData || []);
    setChampionshipSchedule(championshipRows || []);
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

  const teamRankings = useMemo(() => (
    buildTeamRankings(teams, nflTeams, players)
  ), [teams, nflTeams, players]);

  useEffect(() => {
    if (!championshipSchedule.length || !Object.keys(grouped).length) return;

    setMatchupDrafts((current) => {
      if (Object.values(current).some((drafts) => drafts.length)) return current;

      const restored = restoreDraftsFromSchedule(championshipSchedule, grouped);
      return Object.keys(restored).length ? restored : current;
    });
  }, [championshipSchedule, grouped]);

  const plannerUnlocked = regularGameStatus.ready || manualOverride;
  const scheduleFields = useMemo(() => {
    const playableFields = fields.filter(isPlayableField);
    const championshipFields = playableFields.filter((field) => (field.season_phase || "regular") === "championship");
    return championshipFields.length ? championshipFields : playableFields;
  }, [fields]);

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

  const addWinnersGame = (division, firstGameNumber, secondGameNumber) => {
    setMatchupDrafts((current) => {
      const drafts = current[division] || [];
      const firstIndex = Math.max(0, Number(firstGameNumber || 1) - 1);
      const secondIndex = Math.max(0, Number(secondGameNumber || 1) - 1);

      return {
        ...current,
        [division]: [
          ...drafts,
          {
            homeParticipant: drafts[firstIndex] ? getWinnerValue(firstIndex) : "",
            awayParticipant: drafts[secondIndex] && secondIndex !== firstIndex ? getWinnerValue(secondIndex) : "",
            winnerParticipant: "",
          },
        ],
      };
    });
  };

  const addLatestWinnersGame = (division) => {
    setMatchupDrafts((current) => {
      const drafts = current[division] || [];
      const firstIndex = Math.max(0, drafts.length - 2);
      const secondIndex = Math.max(0, drafts.length - 1);

      return {
        ...current,
        [division]: [
          ...drafts,
          {
            homeParticipant: drafts[firstIndex] ? getWinnerValue(firstIndex) : "",
            awayParticipant: drafts[secondIndex] && secondIndex !== firstIndex ? getWinnerValue(secondIndex) : "",
            winnerParticipant: "",
          },
        ],
      };
    });
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

  const createSuggestedMatchupsForAll = () => {
    const nextDrafts = {};
    Object.entries(grouped).forEach(([division, rows]) => {
      const suggestions = [];
      for (let left = 0, right = rows.length - 1; left < right; left += 1, right -= 1) {
        suggestions.push({
          homeParticipant: getSeedValue(rows[left].seed),
          awayParticipant: getSeedValue(rows[right].seed),
          winnerParticipant: "",
        });
      }
      if (suggestions.length) nextDrafts[division] = suggestions;
    });

    setMatchupDrafts((current) => ({ ...current, ...nextDrafts }));
  };

  const saveChampionshipSchedule = async (divisionToSave = "all") => {
    setScheduleStatus(null);

    if (!scheduleFields.length) {
      setScheduleStatus({ type: "error", message: "No game fields are available. Add championship fields or regular game fields first." });
      return;
    }

    const divisionsToSchedule = divisionToSave === "all"
      ? Object.keys(matchupDrafts)
      : [divisionToSave];

    const scheduleRows = [];
    const missingSlots = [];

    divisionsToSchedule.forEach((division) => {
      const drafts = matchupDrafts[division] || [];
      const seededRows = grouped[division] || [];

      drafts.forEach((draft, index) => {
        if (!draft.homeParticipant || !draft.awayParticipant) return;

        const block = getDraftScheduleBlock(draft, scheduleFields, fieldTimeBlocks);
        if (!block || !draft.date || !draft.fieldId || !draft.time) {
          missingSlots.push(`${division} Game ${index + 1}`);
          return;
        }

        const homeLabel = resolveParticipantLabel(draft.homeParticipant, seededRows, drafts);
        const awayLabel = resolveParticipantLabel(draft.awayParticipant, seededRows, drafts);
        const source = `championship:${division}:game:${index + 1}`;

        scheduleRows.push({
          week: null,
          field_id: block.field.id,
          time: block.time,
          event_time: block.time,
          field: block.field.name,
          event_date: block.date,
          division,
          team: homeLabel,
          opponent: awayLabel,
          event_type: "championship game",
          source,
        });
      });
    });

    if (missingSlots.length) {
      setScheduleStatus({ type: "error", message: `Add date, field, and time for: ${missingSlots.join(", ")}.` });
      return;
    }

    if (!scheduleRows.length) {
      setScheduleStatus({ type: "error", message: "Add at least one complete seed matchup before saving games." });
      return;
    }

    const active = await getActiveSeason();
    const sourceIds = scheduleRows.map((row) => row.source);
    const { data: existingRows, error: existingError } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("id,source")
      .in("source", sourceIds), active);

    if (existingError) {
      console.error("Championship schedule lookup failed:", existingError);
      setScheduleStatus({ type: "error", message: `Could not check existing games: ${existingError.message}` });
      return;
    }

    const existingBySource = new Map((existingRows || []).map((row) => [row.source, row]));
    const inserts = [];
    const updates = [];

    scheduleRows.forEach((row) => {
      const existing = existingBySource.get(row.source);
      if (existing?.id) {
        updates.push(supabase.from("schedule_master_auto").update(row).eq("id", existing.id));
      } else {
        inserts.push({ ...row, season_id: active.seasonId });
      }
    });

    const insertResults = inserts.length ? [await supabase.from("schedule_master_auto").insert(inserts)] : [];
    const updateResults = await Promise.all(updates);
    const results = [...insertResults, ...updateResults];
    const saveError = results.find((result) => result.error)?.error;

    if (saveError) {
      console.error("Championship schedule save failed:", saveError);
      setScheduleStatus({ type: "error", message: `Could not save championship games: ${saveError.message}` });
      return;
    }

    const savedCount = inserts.length + updates.length;
    setScheduleStatus({ type: "success", message: `${savedCount} championship game${savedCount === 1 ? "" : "s"} saved to the schedule.` });
    loadData();
  };

  return (
    <div style={wrap}>
      <div>
        <h2 style={title}>Championships</h2>
        <div style={subtitle}>
          Review standings, build seed matchups, and create championship schedule rows from one place.
        </div>
      </div>

      <div style={toolGrid}>
        <ToolTile
          title="Overview"
          text="See readiness, setup status, and next steps."
          active={activeView === "overview"}
          onClick={() => setActiveView("overview")}
        />
        <ToolTile
          title="Championship Seeding"
          text="Review current seeds by division with team ranking details."
          active={activeView === "seeding"}
          onClick={() => setActiveView("seeding")}
        />
        <ToolTile
          title="Create Matchups and Schedule"
          text="Build seed pairings, set date, field, and time, then save games."
          active={activeView === "matchups"}
          onClick={() => setActiveView("matchups")}
        />
      </div>

      {activeView === "overview" && (
        <section style={section}>
          <div style={sectionHeader}>
            <div>
              <div style={divisionTitle}>Championship Overview</div>
              <div style={sectionSub}>Use these steps from left to right once regular season scoring is complete.</div>
            </div>
          </div>

          <div style={overviewGrid}>
            <OverviewCard title="Scoring Progress" value={`${regularGameStatus.scored}/${regularGameStatus.total}`} text={`${regularGameStatus.missing} games still need scores.`} good={regularGameStatus.ready} />
            <OverviewCard title="Seeded Divisions" value={Math.max(visibleDivisions.length - 1, 0)} text="Divisions with completed score data." good={visibleDivisions.length > 1} />
            <OverviewCard title="Planned Matchups" value={Object.values(matchupDrafts).reduce((total, rows) => total + rows.length, 0)} text="Seed matchups currently drafted." />
            <OverviewCard title="Scheduled Championships" value={championshipSchedule.length} text="Championship games already on the schedule." />
          </div>

          <div style={overviewCopy}>
            Start with <strong>Championship Seeding</strong> to confirm rankings. Use <strong>Create Matchups</strong> to pair seeds, set each game date, field, and time, then save those games into the regular schedule so they can be scored and run on the live scoreboard.
          </div>
        </section>
      )}

      {activeView === "matchups" && (
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
          <button
            type="button"
            style={{ ...toggleBtn, ...(!plannerUnlocked ? disabledBtn : {}) }}
            disabled={!plannerUnlocked}
            onClick={createSuggestedMatchupsForAll}
          >
            Suggest All Divisions
          </button>
          <button
            type="button"
            style={{ ...createScheduleBtn, ...(!plannerUnlocked ? disabledBtn : {}) }}
            disabled={!plannerUnlocked}
            onClick={() => saveChampionshipSchedule("all")}
          >
            Save All Games
          </button>
        </div>
      </div>
      )}

      {activeView === "matchups" && scheduleStatus && (
        <div style={{ ...scheduleStatusBox, ...(scheduleStatus.type === "error" ? scheduleErrorBox : scheduleSuccessBox) }}>
          {scheduleStatus.message}
        </div>
      )}

      {activeView !== "overview" && (
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
      )}

      {(activeView === "seeding" || activeView === "matchups") && Object.keys(grouped).length === 0 && (
        <div style={empty}>No completed game scores available for seeding yet.</div>
      )}

      {(activeView === "seeding" || activeView === "matchups") && Object.entries(grouped).map(([division, rows]) => {
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
                <SeedCard
                  key={row.team}
                  row={row}
                  ranking={getTeamRanking(teamRankings, row.team, row.division)}
                />
              ))}
            </div>

            {activeView === "matchups" && (
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
                  <button
                    type="button"
                    style={{ ...smallBtn, ...(!plannerUnlocked ? disabledBtn : {}) }}
                    disabled={!plannerUnlocked}
                    onClick={() => addLatestWinnersGame(division)}
                  >
                    Add Winners Game
                  </button>
                  <button
                    type="button"
                    style={{ ...createScheduleBtn, ...(!plannerUnlocked ? disabledBtn : {}) }}
                    disabled={!plannerUnlocked}
                    onClick={() => saveChampionshipSchedule(division)}
                  >
                    Save Division Games
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
                  scheduleFields={scheduleFields}
                  fieldTimeBlocks={fieldTimeBlocks}
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
            )}
          </section>
        );
      })}
    </div>
  );
}

const wrap = { display: "flex", flexDirection: "column", gap: 18 };
const title = { fontSize: 24, fontWeight: 800, margin: 0 };
const subtitle = { color: "#64748b", fontSize: 13, marginTop: 4 };
const toolGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12 };
const toolTile = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.06)", cursor: "pointer", padding: 16, textAlign: "left" };
const activeToolTile = { background: "#ecfdf3", borderColor: "#16a34a", boxShadow: "0 8px 24px rgba(22,163,74,0.14)" };
const toolTitle = { color: "#0f172a", fontSize: 16, fontWeight: 900 };
const toolText = { color: "#64748b", fontSize: 12, fontWeight: 700, marginTop: 6 };
const overviewGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 12 };
const overviewCard = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 };
const overviewGoodCard = { background: "#f0fdf4", borderColor: "#86efac" };
const overviewTitle = { color: "#64748b", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const overviewValue = { color: "#0f172a", fontSize: 30, fontWeight: 900, marginTop: 4 };
const overviewText = { color: "#64748b", fontSize: 12, fontWeight: 700, marginTop: 4 };
const overviewCopy = { background: "#f8fafc", borderRadius: 12, color: "#334155", fontSize: 13, fontWeight: 700, lineHeight: 1.5, marginTop: 14, padding: 14 };
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
const infoIcon = { alignItems: "center", color: "#2563eb", cursor: "help", display: "inline-flex" };
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
const matchupRow = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxSizing: "border-box", display: "grid", gap: 10, marginTop: 12, padding: 12 };
const matchupRowHeader = { alignItems: "flex-start", display: "flex", gap: 10, justifyContent: "space-between" };
const matchupTeamsGrid = { alignItems: "end", display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)" };
const matchupTeamsGridCompact = { gridTemplateColumns: "minmax(0, 1fr)" };
const seedSelect = { background: "#fff", border: "1px solid #d1d5db", borderRadius: 10, boxSizing: "border-box", color: "#0f172a", fontWeight: 800, minHeight: 42, minWidth: 0, padding: "9px 10px", width: "100%" };
const vsText = { alignSelf: "center", color: "#64748b", fontSize: 12, fontWeight: 900, paddingBottom: 11, textTransform: "uppercase" };
const vsTextCompact = { paddingBottom: 0, textAlign: "center" };
const removeBtn = { background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, color: "#be123c", cursor: "pointer", flex: "0 0 auto", fontWeight: 800, padding: "8px 10px" };
const doubleNote = { background: "#fff7ed", borderRadius: 10, color: "#9a3412", fontSize: 12, fontWeight: 700, marginTop: 12, padding: 10 };
const overrideNote = { background: "#fffbeb", borderRadius: 10, color: "#92400e", fontSize: 12, fontWeight: 800, marginTop: 12, padding: 10 };
const createScheduleBtn = { background: "#16a34a", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 900, minHeight: 42, padding: "10px 12px" };
const scheduleStatusBox = { borderRadius: 10, fontSize: 13, fontWeight: 800, marginTop: 12, padding: 10 };
const scheduleSuccessBox = { background: "#dcfce7", color: "#166534" };
const scheduleErrorBox = { background: "#fee2e2", color: "#991b1b" };
const existingScheduleList = { display: "grid", gap: 10, marginTop: 14 };
const existingScheduleRow = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 };
const gameLabel = { color: "#334155", fontSize: 13, fontWeight: 900, lineHeight: 1.1, textTransform: "uppercase" };
const participantCell = { display: "grid", gap: 5, minWidth: 0 };
const winnerCell = { display: "grid", gap: 4, minWidth: 0 };
const scheduleCell = { display: "grid", gap: 5, minWidth: 0 };
const scheduleSlotGrid = { display: "grid", gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" };
const scheduleSlotGridCompact = { gridTemplateColumns: "minmax(0, 1fr)" };
const winnerLabel = { color: "#64748b", fontSize: 11, fontWeight: 800 };
const gameLabelSub = { color: "#64748b", display: "block", fontSize: 10, fontWeight: 800, lineHeight: 1.15, marginTop: 3, textTransform: "none" };
const resolvedText = { color: "#166534", flex: "1 0 100%", fontSize: 12, fontWeight: 800, marginTop: 2 };
const rankingRow = { alignItems: "center", display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" };
const rankingPill = { background: "#eef2ff", borderRadius: 999, color: "#3730a3", fontSize: 11, fontWeight: 900, padding: "5px 8px" };
const rankingMuted = { color: "#94a3b8", fontSize: 11, fontWeight: 800, marginTop: 8 };

function timeToMinutes(value) {
  if (!value) return 0;
  const text = value.toString().trim().toUpperCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return 0;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function ToolTile({ title, text, active, onClick }) {
  return (
    <button type="button" style={{ ...toolTile, ...(active ? activeToolTile : {}) }} onClick={onClick}>
      <div style={toolTitle}>{title}</div>
      <div style={toolText}>{text}</div>
    </button>
  );
}

function OverviewCard({ title, value, text, good = false }) {
  return (
    <div style={{ ...overviewCard, ...(good ? overviewGoodCard : {}) }}>
      <div style={overviewTitle}>{title}</div>
      <div style={overviewValue}>{value}</div>
      <div style={overviewText}>{text}</div>
    </div>
  );
}

function SeedCard({ row, ranking }) {
  return (
    <div style={seedCard}>
      <div style={seedBadge}>Seed {row.seed}</div>
      <div style={teamName}>{row.team}</div>
      <div style={record}>{row.wins}-{row.losses}{row.ties ? `-${row.ties}` : ""}</div>
      <div style={metricRow}>
        <span>PF {row.pf}</span>
        <span>PA {row.pa}</span>
        <span>DIFF {row.pf - row.pa}</span>
        <span
          style={infoIcon}
          title="PF = points scored. PA = points allowed. DIFF = PF minus PA, used as a seeding tiebreaker after wins."
        >
          <Info size={13} />
        </span>
      </div>
      {ranking ? (
        <div style={rankingRow}>
          <span style={rankingPill}>Team Rank {ranking.total}</span>
          <span style={rankingPill}>Avg {ranking.average}</span>
          <span style={rankingPill}>{ranking.count} Players</span>
        </div>
      ) : (
        <div style={rankingMuted}>No player rankings found</div>
      )}
    </div>
  );
}

function MatchupPlannerRow({
  index,
  matchup,
  rows,
  divisionDrafts,
  scheduleFields,
  fieldTimeBlocks,
  updateMatchup,
  removeMatchup,
}) {
  const participantOptions = addSelectedParticipantOptions(
    buildParticipantOptions(rows, divisionDrafts, index),
    [matchup.homeParticipant, matchup.awayParticipant]
  );
  const selectedField = scheduleFields.find((field) => field.id === matchup.fieldId);
  const availableTimes = selectedField
    ? fieldTimeBlocks
      .filter((block) => block.field_id === selectedField.id)
      .map((block) => block.time)
      .sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
    : [];
  const compact = typeof window !== "undefined" && window.innerWidth <= 720;

  return (
    <div style={matchupRow}>
      <div style={matchupRowHeader}>
        <div style={gameLabel}>
          Game {index + 1}
          <span style={gameLabelSub}>Use Winner of Game {index + 1} in later games</span>
        </div>
        <button type="button" style={removeBtn} onClick={removeMatchup}>
          Remove
        </button>
      </div>

      <div style={{ ...matchupTeamsGrid, ...(compact ? matchupTeamsGridCompact : {}) }}>
        <div style={participantCell}>
          <span style={winnerLabel}>Team / placeholder</span>
          <select
            value={matchup.homeParticipant || ""}
            onChange={(e) => updateMatchup("homeParticipant", e.target.value)}
            style={seedSelect}
          >
            <option value="">Select team</option>
            {participantOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <span style={{ ...vsText, ...(compact ? vsTextCompact : {}) }}>vs</span>

        <div style={participantCell}>
          <span style={winnerLabel}>Team / placeholder</span>
          <select
            value={matchup.awayParticipant || ""}
            onChange={(e) => updateMatchup("awayParticipant", e.target.value)}
            style={seedSelect}
          >
            <option value="">Select team</option>
            {participantOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={scheduleCell}>
        <span style={winnerLabel}>Schedule slot</span>
        <div style={{ ...scheduleSlotGrid, ...(compact ? scheduleSlotGridCompact : {}) }}>
          <input
            type="date"
            value={matchup.date || ""}
            onChange={(e) => updateMatchup("date", e.target.value)}
            style={seedSelect}
          />

          <select
            value={matchup.fieldId || ""}
            onChange={(e) => {
              updateMatchup("fieldId", e.target.value);
              updateMatchup("time", "");
            }}
            style={seedSelect}
          >
            <option value="">Auto field</option>
            {scheduleFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}{field.field_number ? ` #${field.field_number}` : ""}
              </option>
            ))}
          </select>

          <input
            list={`championship-times-${index}`}
            value={matchup.time || ""}
            onChange={(e) => updateMatchup("time", e.target.value)}
            placeholder={matchup.fieldId ? "Time" : "Choose field first"}
            style={seedSelect}
            disabled={!matchup.fieldId}
          />
          <datalist id={`championship-times-${index}`}>
            {availableTimes.map((time) => (
              <option key={`${matchup.fieldId}-${time}`} value={time} />
            ))}
          </datalist>
        </div>
      </div>

      <div style={resolvedText}>
        Game {index + 1}: {resolveParticipantLabel(matchup.homeParticipant, rows, divisionDrafts) || "TBD"} vs {resolveParticipantLabel(matchup.awayParticipant, rows, divisionDrafts) || "TBD"}
      </div>
    </div>
  );
}

function buildParticipantOptions(rows, divisionDrafts, currentIndex) {
  const seedOptions = rows.map((row) => ({
    value: getSeedValue(row.seed),
    label: `#${row.seed} ${row.team}`,
  }));

  const winnerOptions = divisionDrafts
    .map((_, index) => ({
      value: getWinnerValue(index),
      label: `Winner of Game ${index + 1}`,
    }))
    .filter((option) => option.value !== getWinnerValue(currentIndex));

  return [...seedOptions, ...winnerOptions];
}

function addSelectedParticipantOptions(options, values) {
  const existingValues = new Set(options.map((option) => option.value));
  const extras = values
    .filter(Boolean)
    .filter((value) => !existingValues.has(value))
    .map((value) => ({ value, label: value }));

  return [...options, ...extras];
}

function restoreDraftsFromSchedule(championshipSchedule, grouped) {
  const restored = {};

  championshipSchedule.forEach((game) => {
    const sourceMatch = String(game.source || "").match(/^championship:(.*):game:(\d+)$/i);
    if (!sourceMatch) return;

    const division = game.division || sourceMatch[1];
    const index = Number(sourceMatch[2]) - 1;
    if (index < 0) return;

    if (!restored[division]) restored[division] = [];
    restored[division][index] = {
      homeParticipant: getParticipantValueFromLabel(game.team, grouped[division] || []),
      awayParticipant: getParticipantValueFromLabel(game.opponent, grouped[division] || []),
      winnerParticipant: "",
      date: game.event_date || "",
      fieldId: game.field_id || "",
      time: game.event_time || game.time || "",
    };
  });

  Object.keys(restored).forEach((division) => {
    restored[division] = restored[division].filter(Boolean);
  });

  return restored;
}

function getParticipantValueFromLabel(label, rows) {
  const cleanLabel = String(label || "").replace(/\s+/g, " ").trim();
  const winnerMatch = cleanLabel.match(/^winner of game\s+(\d+)$/i);
  if (winnerMatch) return getWinnerValue(Number(winnerMatch[1]) - 1);

  const seedMatch = cleanLabel.match(/^#(\d+)\s+/);
  if (seedMatch) return getSeedValue(Number(seedMatch[1]));

  const row = rows.find((item) => item.team.toLowerCase() === cleanLabel.toLowerCase());
  return row ? getSeedValue(row.seed) : cleanLabel;
}

function getDraftScheduleBlock(draft, scheduleFields, fieldTimeBlocks) {
  if (!draft?.date && !draft?.fieldId && !draft?.time) return null;

  const date = draft.date;
  const field = scheduleFields.find((item) => item.id === draft.fieldId);
  if (!date || !field) return null;

  if (draft.time) {
    return { date, field, time: draft.time };
  }

  const fieldTimes = fieldTimeBlocks
    .filter((block) => block.field_id === field.id)
    .map((block) => block.time)
    .sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  const time = fieldTimes[0];

  if (!time) return null;
  return { date, field, time };
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
  const source = (game.source || "").toLowerCase();
  const eventType = (game.event_type || "").toLowerCase();
  if (source === "scoreboard-test" || game.is_scoreboard_test) return false;
  if (eventType.includes("test")) return false;
  if (eventType.includes("champ")) return false;
  if (eventType.includes("practice")) return false;
  return true;
}

function isPlayableField(field) {
  const type = (field?.type || "").toString().trim().toLowerCase();
  if (!type) return true;
  if (type.includes("practice")) return false;
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

function dedupeScoresByScheduleId(scores) {
  const byScheduleId = new Map();

  scores.forEach((score) => {
    if (!score.schedule_id) return;
    const existing = byScheduleId.get(score.schedule_id);
    if (!existing || new Date(score.created_at || 0) > new Date(existing.created_at || 0)) {
      byScheduleId.set(score.schedule_id, score);
    }
  });

  return [...byScheduleId.values()];
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

function buildTeamRankings(teams, nflTeams, players) {
  const nflById = {};
  nflTeams.forEach((team) => {
    nflById[team.id] = team;
  });

  const playersByTeamId = {};
  players.forEach((player) => {
    if (!player.team_id) return;
    if (!playersByTeamId[player.team_id]) playersByTeamId[player.team_id] = [];
    playersByTeamId[player.team_id].push(player);
  });

  const map = {};

  teams.forEach((team) => {
    const nflTeam = nflById[team.nfl_team_id] || {};
    const teamPlayers = playersByTeamId[team.id] || [];
    const count = teamPlayers.length;
    const total = teamPlayers.reduce((sum, player) => sum + getPlayerRating(player), 0);
    const ranking = {
      count,
      total,
      average: count ? (total / count).toFixed(1) : "0.0",
    };

    [nflTeam.short_name, nflTeam.full_name].filter(Boolean).forEach((name) => {
      const key = getRankingKey(name, team.division);
      map[key] = ranking;
      const fallbackKey = getRankingKey(name, "");
      if (!map[fallbackKey]) map[fallbackKey] = ranking;
    });
  });

  return map;
}

function getTeamRanking(rankings, teamName, division) {
  const ranking = rankings[getRankingKey(teamName, division)] || rankings[getRankingKey(teamName, "")] || null;
  return ranking?.count ? ranking : null;
}

function getRankingKey(teamName, division) {
  return `${normalizeName(teamName)}|${normalizeDivision(division)}`;
}

function normalizeName(value) {
  return (value || "").toString().toLowerCase().replace(/\s+/g, " ").trim();
}

function getPlayerRating(player) {
  return Number(player.rating || player.rank_score || 3);
}
