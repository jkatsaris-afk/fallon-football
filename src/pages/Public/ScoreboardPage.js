import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Radio, Search, Shield, Users } from "lucide-react";
import { supabase } from "../../supabase";
import { applyUuidSeasonFilter, getActiveSeason } from "../../utils/season";

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

const LIVE_GAME_STATUSES = ["live", "halftime", "timeout", "timeout_home", "timeout_away", "final_display"];
const RECENT_SCORE_LIMIT = 8;
const TEAM_LOGOS = {
  bills, bengals, broncos, lions, colts, chiefs, raiders, rams, jets, eagles,
  steelers, ravens, "49ers": niners,
};

export default function ScoreboardPage({ initialLive = false, initialBrackets = false }) {
  const [scores, setScores] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [scheduleById, setScheduleById] = useState({});
  const [championshipGames, setChampionshipGames] = useState([]);
  const [championshipScores, setChampionshipScores] = useState([]);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("week");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [selectedTeamKey, setSelectedTeamKey] = useState("all");
  const [showLive, setShowLive] = useState(initialLive);
  const [showBrackets, setShowBrackets] = useState(initialBrackets);
  const [selectedBracketDivision, setSelectedBracketDivision] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directLiveView = initialLive || params.get("view") === "live" || params.get("live") === "1";

    if (directLiveView || sessionStorage.getItem("publicScoreboardView") === "live") {
      setShowLive(true);
      sessionStorage.removeItem("publicScoreboardView");
    }

    if (initialBrackets || params.get("view") === "brackets") {
      setShowBrackets(true);
    }

    loadData();
    loadChampionshipBracket();

    const scoreChannel = supabase
      .channel("public-score-results")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_scores" }, loadData)
      .subscribe();

    const liveChannel = supabase
      .channel("public-live-scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "games_live" }, loadData)
      .subscribe();

    const scheduleChannel = supabase
      .channel("public-championship-schedule")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_master_auto" }, loadChampionshipBracket)
      .subscribe();

    const interval = setInterval(() => {
      loadData();
      loadChampionshipBracket();
    }, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(scoreChannel);
      supabase.removeChannel(liveChannel);
      supabase.removeChannel(scheduleChannel);
    };
  }, []);

  useEffect(() => {
    if (!showLive) return undefined;

    loadLiveData();
    const liveInterval = setInterval(loadLiveData, 1000);
    return () => clearInterval(liveInterval);
  }, [showLive]);

  const loadData = async () => {
    const active = await getActiveSeason();
    const [{ data: scoreData }, { data: liveData }] = await Promise.all([
      supabase
        .from("game_scores")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("games_live")
        .select("*")
        .in("status", LIVE_GAME_STATUSES)
        .order("created_at", { ascending: false }),
    ]);

    const scheduleIds = [
      ...new Set([
        ...(scoreData || []).map((score) => score.schedule_id),
        ...(liveData || []).map((game) => game.schedule_id),
      ].filter(Boolean)),
    ];

    let nextScheduleById = {};
    if (scheduleIds.length) {
      const { data: scheduleRows } = await applyUuidSeasonFilter(supabase
        .from("schedule_master_auto")
        .select("*")
        .in("id", scheduleIds), active);

      (scheduleRows || []).forEach((game) => {
        nextScheduleById[game.id] = game;
      });
    }

    setScores((scoreData || []).filter((score) => nextScheduleById[score.schedule_id]));
    setLiveGames((liveData || []).map((game) => ({
      ...game,
      schedule: nextScheduleById[game.schedule_id],
    })));
    setScheduleById(nextScheduleById);
    setLoading(false);
  };

  const loadLiveData = async () => {
    const active = await getActiveSeason();
    const { data: liveData } = await supabase
      .from("games_live")
      .select("*")
      .in("status", LIVE_GAME_STATUSES)
      .order("created_at", { ascending: false });

    const scheduleIds = [...new Set((liveData || []).map((game) => game.schedule_id).filter(Boolean))];
    let liveScheduleById = {};

    if (scheduleIds.length) {
      const { data: scheduleRows } = await applyUuidSeasonFilter(supabase
        .from("schedule_master_auto")
        .select("*")
        .in("id", scheduleIds), active);

      (scheduleRows || []).forEach((game) => {
        liveScheduleById[game.id] = game;
      });
    }

    setLiveGames((liveData || []).filter((game) => liveScheduleById[game.schedule_id]).map((game) => ({
      ...game,
      schedule: liveScheduleById[game.schedule_id],
    })));
    setScheduleById((current) => ({ ...current, ...liveScheduleById }));
    setLoading(false);
  };

  const loadChampionshipBracket = async () => {
    const active = await getActiveSeason();
    const { data: scheduleRows } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*")
      .ilike("event_type", "%champ%")
      .order("division", { ascending: true })
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true }), active);

    const scheduleIds = (scheduleRows || []).map((game) => game.id).filter(Boolean);
    const { data: scoreRows } = scheduleIds.length
      ? await supabase.from("game_scores").select("*").in("schedule_id", scheduleIds)
      : { data: [] };

    setChampionshipGames(scheduleRows || []);
    setChampionshipScores(dedupeScoresByScheduleId(scoreRows || []));
  };

  const scoreRows = useMemo(() => (
    scores.map((score) => {
      const game = scheduleById[score.schedule_id] || {};
      return {
        ...score,
        game,
        week: game.week,
        division: normalizeDivision(game.division),
        field: game.field,
        eventDate: game.event_date,
        eventTime: game.event_time || game.time,
        homeKey: teamKey(score.home_team, game.division),
        awayKey: teamKey(score.away_team, game.division),
      };
    })
  ), [scores, scheduleById]);

  const weekTiles = useMemo(() => {
    const map = {};
    scoreRows.forEach((row) => {
      if (!row.week) return;
      if (!map[row.week]) map[row.week] = [];
      if (row.eventDate) map[row.week].push(row.eventDate);
    });
    return Object.entries(map)
      .map(([week, dates]) => ({
        week,
        dateLabel: formatDateRange(dates),
        count: scoreRows.filter((row) => String(row.week) === String(week)).length,
      }))
      .sort((a, b) => Number(a.week) - Number(b.week));
  }, [scoreRows]);

  const teamTiles = useMemo(() => {
    const map = {};
    scoreRows.forEach((row) => {
      [
        { key: row.homeKey, name: row.home_team },
        { key: row.awayKey, name: row.away_team },
      ].forEach((team) => {
        if (!team.name || !team.key) return;
        if (!map[team.key]) {
          map[team.key] = {
            key: team.key,
            name: cleanTeamName(team.name),
            division: row.division,
            logo: getLogo(team.name),
            count: 0,
          };
        }
        map[team.key].count += 1;
      });
    });
    return Object.values(map).sort((a, b) => sortDivisions(a.division, b.division) || a.name.localeCompare(b.name));
  }, [scoreRows]);

  const filteredScores = useMemo(() => {
    const query = search.trim().toLowerCase();

    return scoreRows.filter((score) => {
      if (mode === "week" && selectedWeek !== "all" && String(score.week) !== String(selectedWeek)) return false;
      if (mode === "team" && selectedTeamKey !== "all" && score.homeKey !== selectedTeamKey && score.awayKey !== selectedTeamKey) return false;
      if (!query) return true;

      const haystack = [
        score.home_team,
        score.away_team,
        score.home_score,
        score.away_score,
        score.division,
        score.week,
        score.field,
        score.eventDate,
        score.eventTime,
      ].join(" ").toLowerCase();

      return haystack.includes(query);
    });
  }, [mode, scoreRows, search, selectedTeamKey, selectedWeek]);

  const visibleScores = useMemo(() => (
    search.trim() || selectedWeek !== "all" || selectedTeamKey !== "all"
      ? filteredScores
      : filteredScores.slice(0, RECENT_SCORE_LIMIT)
  ), [filteredScores, search, selectedTeamKey, selectedWeek]);

  const liveCount = liveGames.length;
  const bracketScoreByScheduleId = useMemo(() => {
    const map = {};
    championshipScores.forEach((score) => {
      map[score.schedule_id] = score;
    });
    return map;
  }, [championshipScores]);
  const bracketDivisions = useMemo(() => (
    ["all", ...new Set(championshipGames.map((game) => normalizeDivision(game.division)).filter(Boolean).sort(sortDivisions))]
  ), [championshipGames]);
  const bracketGroups = useMemo(() => (
    buildChampionshipBracketGroups(championshipGames, bracketScoreByScheduleId, selectedBracketDivision)
  ), [bracketScoreByScheduleId, championshipGames, selectedBracketDivision]);

  if (showLive) {
    return (
      <LiveScoreboardView
        liveGames={liveGames}
        loading={loading}
        onBack={() => {
          window.history.replaceState({}, "", "/scoreboard");
          setShowLive(false);
        }}
      />
    );
  }

  if (showBrackets) {
    return (
      <PublicChampionshipBracketView
        groups={bracketGroups}
        divisions={bracketDivisions}
        selectedDivision={selectedBracketDivision}
        onSelectDivision={setSelectedBracketDivision}
        loading={loading}
        onBack={() => {
          window.history.replaceState({}, "", "/scoreboard");
          setShowBrackets(false);
        }}
      />
    );
  }

  return (
    <div style={wrap}>
      <section style={hero}>
        <div>
          <div style={eyebrow}>Public Scores</div>
          <h1 style={title}>Game Results</h1>
          <div style={heroText}>Search finals by week, team, division, field, or score.</div>
        </div>
      </section>

      <button
        type="button"
        style={{ ...liveTile, ...(liveCount ? liveTileActive : {}) }}
        onClick={() => {
          window.history.pushState({}, "", "/scoreboard/live");
          setShowLive(true);
        }}
      >
        <div style={liveTileIcon}><Radio size={22} /></div>
        <div>
          <div style={liveTileTitle}>Live Scoreboard</div>
          <div style={liveTileSub}>{liveCount ? `${liveCount} live game${liveCount === 1 ? "" : "s"}` : "No games live right now"}</div>
        </div>
      </button>

      <button
        type="button"
        style={bracketTile}
        onClick={() => {
          window.history.pushState({}, "", "/scoreboard/brackets");
          setShowBrackets(true);
        }}
      >
        <div style={bracketTileIcon}><Shield size={22} /></div>
        <div>
          <div style={liveTileTitle}>Championship Brackets</div>
          <div style={liveTileSub}>{championshipGames.length ? `${championshipGames.length} scheduled game${championshipGames.length === 1 ? "" : "s"}` : "No bracket games yet"}</div>
        </div>
      </button>

      <div style={searchShell}>
        <Search size={19} color="#64748b" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search team, division, week, field, score..."
          style={searchInput}
        />
      </div>

      <div style={modeGrid}>
        <ModeTile icon={<CalendarDays size={22} />} title="By Week" active={mode === "week"} onClick={() => setMode("week")} />
        <ModeTile icon={<Users size={22} />} title="By Team" active={mode === "team"} onClick={() => setMode("team")} />
      </div>

      {mode === "week" && (
        <div style={tileGrid}>
          <button style={selectorTile(selectedWeek === "all")} onClick={() => setSelectedWeek("all")}>
            <div style={tileTitle}>Recent Scores</div>
            <div style={tileSub}>All weeks</div>
          </button>
          {weekTiles.map((week) => (
            <button key={week.week} style={selectorTile(String(selectedWeek) === String(week.week))} onClick={() => setSelectedWeek(String(week.week))}>
              <div style={tileTitle}>Week {week.week}</div>
              <div style={tileSub}>{week.dateLabel}</div>
              <div style={tileMeta}>{week.count} finals</div>
            </button>
          ))}
        </div>
      )}

      {mode === "team" && (
        <div style={tileGrid}>
          <button style={selectorTile(selectedTeamKey === "all")} onClick={() => setSelectedTeamKey("all")}>
            <div style={tileTitle}>All Teams</div>
            <div style={tileSub}>Full results</div>
          </button>
          {teamTiles.map((team) => (
            <button key={team.key} style={selectorTile(selectedTeamKey === team.key)} onClick={() => setSelectedTeamKey(team.key)}>
              <div style={teamTileTop}>
                {team.logo && <img src={team.logo} alt="" style={teamTileLogo} />}
                <div>
                  <div style={tileTitle}>{team.name}</div>
                  <div style={tileSub}>{team.division}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <section style={listCard}>
        <div style={listHeader}>
          <div>
            <div style={sectionTitle}>{getScoreListTitle(mode, selectedWeek, selectedTeamKey, teamTiles)}</div>
            <div style={sectionSub}>{filteredScores.length} final score{filteredScores.length === 1 ? "" : "s"}</div>
          </div>
        </div>

        {loading && <div style={emptyState}>Loading scores...</div>}

        {!loading && filteredScores.length === 0 && (
          <div style={emptyState}>
            {scores.length ? "No scores match that search." : "No completed scores have been posted yet."}
          </div>
        )}

        <div style={rows}>
          {!loading && visibleScores.map((score) => (
            <ScoreTile
              key={score.id}
              score={score}
              game={score.game}
            />
          ))}
        </div>

        {!loading && !search.trim() && selectedWeek === "all" && selectedTeamKey === "all" && filteredScores.length > RECENT_SCORE_LIMIT && (
          <div style={emptyState}>
            Showing the {RECENT_SCORE_LIMIT} most recent finals. Search or choose a week/team to see more.
          </div>
        )}
      </section>
    </div>
  );
}

function ModeTile({ icon, title, active, onClick }) {
  return (
    <button style={{ ...modeTile, ...(active ? activeModeTile : {}) }} onClick={onClick}>
      <div style={modeIcon}>{icon}</div>
      <div style={modeTitle}>{title}</div>
    </button>
  );
}

function LiveScoreboardView({ liveGames, loading, onBack }) {
  return (
    <div style={livePage}>
      <div style={livePageHeader}>
        <button type="button" style={backButton} onClick={onBack}>
          Scores
        </button>
        <div>
          <div style={livePageTitle}>Live Scoreboard</div>
          <div style={livePageSub}>Scores and time left update automatically.</div>
        </div>
      </div>

      {loading && <div style={liveEmpty}>Loading live scores...</div>}

      {!loading && liveGames.length === 0 && (
        <div style={liveEmpty}>No games are live right now.</div>
      )}

      {!loading && liveGames.map((game) => (
        <LiveGameTile key={game.id} game={game} featured />
      ))}
    </div>
  );
}

function PublicChampionshipBracketView({ groups, divisions, selectedDivision, onSelectDivision, loading, onBack }) {
  return (
    <div style={livePage}>
      <div style={livePageHeader}>
        <button type="button" style={backButton} onClick={onBack}>
          Scores
        </button>
        <div>
          <div style={livePageTitle}>Championship Brackets</div>
          <div style={livePageSub}>Brackets update as scores are posted.</div>
        </div>
      </div>

      <div style={bracketFilterRow}>
        {divisions.map((division) => (
          <button
            key={division}
            type="button"
            style={{
              ...bracketFilterBtn,
              ...(selectedDivision === division ? bracketFilterBtnActive : {}),
            }}
            onClick={() => onSelectDivision(division)}
          >
            {division === "all" ? "All Divisions" : division}
          </button>
        ))}
      </div>

      {loading && <div style={liveEmpty}>Loading brackets...</div>}

      {!loading && !groups.length && (
        <div style={liveEmpty}>No championship bracket games have been scheduled yet.</div>
      )}

      {!loading && groups.map((group) => (
        <section key={group.division} style={publicBracketSection}>
          <div style={publicBracketDivisionHeader}>
            <div>
              <div style={publicBracketTitle}>{group.division}</div>
              <div style={publicBracketSubtitle}>{group.games.length} championship game{group.games.length === 1 ? "" : "s"}</div>
            </div>
          </div>
          <div style={publicBracketScroll}>
            <div style={publicBracketPath}>
              {group.games.map((game, index) => (
                <div key={game.id} style={publicBracketNode}>
                  <PublicBracketCard game={game} />
                  {index < group.games.length - 1 && (
                    <div style={publicBracketConnector}>
                      <span style={publicBracketConnectorDot} />
                      <span style={publicBracketConnectorLine} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function PublicBracketCard({ game }) {
  const score = game.score;
  const hasScore = !!score;
  const homeScore = Number(score?.home_score || 0);
  const awayScore = Number(score?.away_score || 0);
  const winner = hasScore && homeScore !== awayScore
    ? homeScore > awayScore ? game.team : game.opponent
    : "";

  return (
    <article style={publicBracketCard}>
      <div style={publicBracketTop}>
        <div>
          <div style={publicBracketGame}>Game {game.gameNumber || "-"}</div>
          <div style={publicBracketMeta}>
            {formatDate(game.event_date)} • {game.event_time || game.time || "Time TBD"} • {game.field || "Field TBD"}
          </div>
        </div>
        <span style={{ ...publicBracketStatus, ...(hasScore ? publicBracketFinal : publicBracketScheduled) }}>
          {hasScore ? "Final" : "Scheduled"}
        </span>
      </div>

      <PublicBracketTeam name={game.team || "Team TBD"} score={hasScore ? homeScore : null} winner={winner === game.team} />
      <PublicBracketTeam name={game.opponent || "Opponent TBD"} score={hasScore ? awayScore : null} winner={winner === game.opponent} />

      <div style={{ ...publicBracketWinner, ...(winner ? publicBracketWinnerReady : {}) }}>
        {winner ? `Advances: ${winner}` : "Winner advances"}
      </div>
    </article>
  );
}

function PublicBracketTeam({ name, score, winner }) {
  const logo = getLogo(name);
  return (
    <div style={{ ...publicBracketTeam, ...(winner ? publicBracketTeamWinner : {}) }}>
      <div style={publicBracketTeamName}>
        {logo && <img src={logo} alt="" style={publicBracketLogo} />}
        <span>{cleanTeamName(name)}</span>
      </div>
      <span style={publicBracketScore}>{score === null ? "-" : score}</span>
    </div>
  );
}

function LiveGameTile({ game }) {
  const schedule = game.schedule || {};
  const statusLabel = getLiveStatusLabel(game.status);
  const homeTeam = schedule.team || "Home";
  const awayTeam = schedule.opponent || "Away";

  return (
    <div style={liveScoreCard}>
      <div style={liveCardTop}>
        <span style={liveStatusPill}>{statusLabel}</span>
        <span style={liveClockPill}>{game.clock || "0:00"}</span>
      </div>

      <div style={liveMatchupRow}>
        <LiveTeamScore name={homeTeam} score={game.home_score} />
        <div style={liveVs}>vs</div>
        <LiveTeamScore name={awayTeam} score={game.away_score} />
      </div>

      <div style={liveDetailLine}>
        {schedule.field || "Field TBD"} • {schedule.division || "Division TBD"}{schedule.week ? ` • Week ${schedule.week}` : ""}
      </div>
    </div>
  );
}

function LiveTeamScore({ name, score }) {
  const logo = getLogo(name);

  return (
    <div style={liveTeamBox}>
      <div style={liveTeamTop}>
        {logo && <img src={logo} alt="" style={liveTeamLogo} />}
        <div style={liveTeamName}>{cleanTeamName(name)}</div>
      </div>
      <div style={liveScoreNumber}>{Number(score || 0)}</div>
    </div>
  );
}

function ScoreTile({ score, game }) {
  const homeScore = Number(score.home_score || 0);
  const awayScore = Number(score.away_score || 0);
  const winner = homeScore === awayScore
    ? "Tie"
    : homeScore > awayScore
    ? cleanTeamName(score.home_team)
    : cleanTeamName(score.away_team);

  return (
    <article style={resultTile}>
      <div style={resultMeta}>
        <span style={miniPill}>{normalizeDivision(game?.division) || "Final"}</span>
        <span style={mutedText}>
          {formatDate(game?.event_date)}{game?.week ? ` • Week ${game.week}` : ""}
        </span>
      </div>

      <div style={scoreRow}>
        <TeamScore name={score.home_team} score={homeScore} winner={homeScore > awayScore} />
        <div style={scoreDivider}>final</div>
        <TeamScore name={score.away_team} score={awayScore} winner={awayScore > homeScore} />
      </div>

      <div style={detailLine}>
        {winner === "Tie" ? "Tie game" : `${winner} win`}{game?.field ? ` • ${game.field}` : ""}{game?.event_time || game?.time ? ` • ${game.event_time || game.time}` : ""}
      </div>
    </article>
  );
}

function TeamScore({ name, score, winner = false }) {
  const logo = getLogo(name);

  return (
    <div style={{ ...teamScore, ...(winner ? winnerTeam : {}) }}>
      <div style={teamLogoRow}>
        {logo && <img src={logo} alt="" style={teamLogo} />}
        <div style={teamName}>{cleanTeamName(name)}</div>
      </div>
      <div style={scoreNumber}>{Number(score || 0)}</div>
    </div>
  );
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function getLogo(team) {
  const cleaned = cleanTeamName(team);
  const key = cleaned.toLowerCase();
  if (key.includes("49")) return TEAM_LOGOS["49ers"];
  if (key.includes("bengal")) return TEAM_LOGOS.bengals;
  if (key.includes("bill")) return TEAM_LOGOS.bills;
  if (key.includes("bronco")) return TEAM_LOGOS.broncos;
  if (key.includes("chief")) return TEAM_LOGOS.chiefs;
  if (key.includes("colt")) return TEAM_LOGOS.colts;
  if (key.includes("eagle")) return TEAM_LOGOS.eagles;
  if (key.includes("jet")) return TEAM_LOGOS.jets;
  if (key.includes("lion")) return TEAM_LOGOS.lions;
  if (key.includes("raider")) return TEAM_LOGOS.raiders;
  if (key.includes("ram")) return TEAM_LOGOS.rams;
  if (key.includes("steeler")) return TEAM_LOGOS.steelers;
  if (key.includes("raven")) return TEAM_LOGOS.ravens;
  return TEAM_LOGOS[key] || null;
}

function getLiveStatusLabel(status) {
  if (status === "halftime") return "Halftime";
  if (status === "timeout" || status === "timeout_home" || status === "timeout_away") return "Timeout";
  if (status === "final_display") return "Final";
  return "Live";
}

function formatDate(value) {
  if (!value) return "Date TBD";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, Number(month || 1) - 1, day || 1);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateRange(dates) {
  const cleanDates = [...new Set(dates.filter(Boolean))].sort();
  if (!cleanDates.length) return "Date TBD";
  if (cleanDates.length === 1) return formatDate(cleanDates[0]);
  return `${formatDate(cleanDates[0])} - ${formatDate(cleanDates[cleanDates.length - 1])}`;
}

function teamKey(name, division) {
  return `${normalizeDivision(division)}::${cleanTeamName(name).toLowerCase()}`;
}

function getScoreListTitle(mode, selectedWeek, selectedTeamKey, teams) {
  if (mode === "week") return selectedWeek === "all" ? "Recent Scores" : `Week ${selectedWeek}`;
  if (selectedTeamKey === "all") return "All Team Scores";
  const team = teams.find((item) => item.key === selectedTeamKey);
  return team ? `${team.division} ${team.name}` : "Team Scores";
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

function buildChampionshipBracketGroups(games, scoreByScheduleId, selectedDivision) {
  const groups = {};

  games.forEach((game) => {
    const division = normalizeDivision(game.division);
    if (selectedDivision !== "all" && division !== selectedDivision) return;
    if (!groups[division]) groups[division] = [];
    groups[division].push({
      ...game,
      gameNumber: getChampionshipGameNumber(game),
      score: scoreByScheduleId[game.id],
    });
  });

  return Object.entries(groups)
    .sort(([a], [b]) => sortDivisions(a, b))
    .map(([division, divisionGames]) => ({
      division,
      games: divisionGames.sort((a, b) => (
        Number(a.gameNumber || 999) - Number(b.gameNumber || 999) ||
        String(a.event_date || "").localeCompare(String(b.event_date || "")) ||
        toTime(a.event_time || a.time) - toTime(b.event_time || b.time)
      )),
    }));
}

function getChampionshipGameNumber(game) {
  const sourceMatch = String(game?.source || "").match(/game:(\d+)/i);
  return sourceMatch ? Number(sourceMatch[1]) : null;
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

function toTime(timeStr) {
  if (!timeStr) return 99999;
  const [time, mod] = String(timeStr).trim().split(" ");
  let [h, m] = time.split(":").map(Number);
  if (mod === "PM" && h !== 12) h += 12;
  if (mod === "AM" && h === 12) h = 0;
  return h * 60 + (m || 0);
}

const wrap = { display: "flex", flexDirection: "column", gap: 14, paddingBottom: 92 };
const hero = { background: "#0f172a", borderRadius: 18, color: "#fff", padding: 20 };
const eyebrow = { color: "#86efac", fontSize: 12, fontWeight: 900, textTransform: "uppercase" };
const title = { fontSize: 32, fontWeight: 900, margin: "5px 0 0" };
const heroText = { color: "#d1d5db", fontSize: 14, fontWeight: 700, marginTop: 8 };
const liveTile = { alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 22px rgba(15,23,42,0.08)", color: "#334155", cursor: "pointer", display: "flex", gap: 12, padding: 14, textAlign: "left" };
const liveTileActive = { borderColor: "#fecaca", boxShadow: "0 12px 24px rgba(220,38,38,0.14)" };
const liveTileIcon = { alignItems: "center", background: "#fee2e2", borderRadius: 12, color: "#dc2626", display: "flex", height: 42, justifyContent: "center", width: 42 };
const bracketTile = { ...liveTile };
const bracketTileIcon = { alignItems: "center", background: "#ecfdf5", borderRadius: 12, color: "#166534", display: "flex", height: 42, justifyContent: "center", width: 42 };
const liveTileTitle = { color: "#0f172a", fontSize: 16, fontWeight: 900 };
const liveTileSub = { color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 3 };
const searchShell = { alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 22px rgba(15,23,42,0.08)", display: "flex", gap: 10, padding: "11px 13px" };
const searchInput = { border: "none", flex: 1, fontSize: 16, fontWeight: 700, minWidth: 0, outline: "none" };
const modeGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" };
const modeTile = { alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 8px 22px rgba(15,23,42,0.08)", color: "#334155", cursor: "pointer", display: "flex", gap: 10, padding: 14, textAlign: "left" };
const activeModeTile = { borderColor: "#86efac", color: "#166534" };
const modeIcon = { alignItems: "center", background: "#ecfdf5", borderRadius: 12, display: "flex", height: 40, justifyContent: "center", width: 40 };
const modeTitle = { fontSize: 15, fontWeight: 900 };
const tileGrid = { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))" };
const selectorTile = (active) => ({ background: "#fff", border: `1px solid ${active ? "#86efac" : "#e2e8f0"}`, borderRadius: 16, boxShadow: active ? "0 12px 24px rgba(22,101,52,0.14)" : "0 8px 22px rgba(15,23,42,0.08)", color: "#0f172a", cursor: "pointer", minHeight: 86, padding: 14, textAlign: "left" });
const tileTitle = { fontSize: 15, fontWeight: 900 };
const tileSub = { color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 4 };
const tileMeta = { color: "#166534", fontSize: 12, fontWeight: 900, marginTop: 6 };
const teamTileTop = { alignItems: "center", display: "flex", gap: 9 };
const teamTileLogo = { height: 34, objectFit: "contain", width: 34 };
const listCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, boxShadow: "0 10px 24px rgba(15,23,42,0.08)", overflow: "hidden" };
const listHeader = { borderBottom: "1px solid #e2e8f0", padding: 16 };
const sectionTitle = { color: "#0f172a", fontSize: 20, fontWeight: 900 };
const sectionSub = { color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 3 };
const rows = { display: "grid" };
const resultTile = { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: 16 };
const resultMeta = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 };
const miniPill = { background: "#ecfdf5", borderRadius: 999, color: "#0f7a3b", fontSize: 12, fontWeight: 800, padding: "5px 9px" };
const mutedText = { color: "#64748b", fontSize: 12, fontWeight: 700, textAlign: "right" };
const scoreRow = { alignItems: "center", display: "grid", gap: 8, gridTemplateColumns: "1fr auto 1fr" };
const teamScore = { borderRadius: 12, padding: "10px 8px", textAlign: "center" };
const winnerTeam = { background: "#ecfdf5" };
const teamLogoRow = { alignItems: "center", display: "flex", flexDirection: "column", gap: 6, minHeight: 58 };
const teamLogo = { height: 34, objectFit: "contain", width: 34 };
const teamName = { color: "#111827", fontSize: 14, fontWeight: 800, lineHeight: 1.05, minHeight: 18 };
const scoreNumber = { color: "#111827", fontSize: 34, fontWeight: 900, lineHeight: 1, marginTop: 6 };
const scoreDivider = { color: "#94a3b8", fontSize: 11, fontWeight: 900, textAlign: "center", textTransform: "uppercase" };
const detailLine = { color: "#64748b", fontSize: 13, fontWeight: 700, marginTop: 10, textAlign: "center" };
const emptyState = { color: "#64748b", fontSize: 14, fontWeight: 800, padding: 22, textAlign: "center" };
const livePage = { display: "flex", flexDirection: "column", gap: 14, minHeight: "calc(100vh - 210px)" };
const livePageHeader = { alignItems: "center", background: "#0f172a", borderRadius: 18, color: "#fff", display: "flex", gap: 14, padding: 16 };
const backButton = { background: "#fff", border: "none", borderRadius: 12, color: "#0f172a", cursor: "pointer", flex: "0 0 auto", fontSize: 13, fontWeight: 900, padding: "10px 12px" };
const livePageTitle = { fontSize: 24, fontWeight: 900, lineHeight: 1 };
const livePageSub = { color: "#cbd5e1", fontSize: 13, fontWeight: 700, marginTop: 4 };
const liveEmpty = { alignItems: "center", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 18, color: "#64748b", display: "flex", flex: 1, fontSize: 18, fontWeight: 900, justifyContent: "center", minHeight: 220, padding: 24, textAlign: "center" };
const liveScoreCard = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, boxShadow: "0 10px 24px rgba(15,23,42,0.1)", padding: 16 };
const liveCardTop = { alignItems: "center", display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 };
const liveStatusPill = { background: "#fee2e2", borderRadius: 999, color: "#b91c1c", fontSize: 13, fontWeight: 900, padding: "7px 10px", textTransform: "uppercase" };
const liveClockPill = { background: "#dbeafe", borderRadius: 999, color: "#1d4ed8", fontSize: 18, fontVariantNumeric: "tabular-nums", fontWeight: 900, padding: "7px 12px" };
const liveMatchupRow = { alignItems: "stretch", display: "grid", gap: 8, gridTemplateColumns: "1fr auto 1fr" };
const liveTeamBox = { alignItems: "center", background: "#f8fafc", borderRadius: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 170, padding: "12px 8px", textAlign: "center" };
const liveTeamTop = { alignItems: "center", display: "flex", flexDirection: "column", gap: 8 };
const liveTeamLogo = { height: 48, objectFit: "contain", width: 48 };
const liveTeamName = { color: "#111827", fontSize: 15, fontWeight: 900, lineHeight: 1.05 };
const liveScoreNumber = { color: "#111827", fontSize: 72, fontVariantNumeric: "tabular-nums", fontWeight: 900, lineHeight: 0.9, marginTop: 10 };
const liveVs = { alignSelf: "center", color: "#94a3b8", fontSize: 11, fontWeight: 900, textTransform: "uppercase" };
const liveDetailLine = { color: "#64748b", fontSize: 14, fontWeight: 800, marginTop: 14, textAlign: "center" };
const bracketFilterRow = { display: "flex", flexWrap: "wrap", gap: 8 };
const bracketFilterBtn = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, color: "#334155", cursor: "pointer", fontWeight: 900, padding: "9px 12px" };
const bracketFilterBtnActive = { background: "#dcfce7", borderColor: "#16a34a", color: "#166534" };
const publicBracketSection = { background: "#0f172a", borderRadius: 22, boxShadow: "0 16px 34px rgba(15,23,42,0.2)", display: "grid", gap: 14, overflow: "hidden", padding: 16 };
const publicBracketDivisionHeader = { alignItems: "center", color: "#fff", display: "flex", justifyContent: "space-between", gap: 12 };
const publicBracketTitle = { color: "#fff", fontSize: 24, fontWeight: 900, lineHeight: 1 };
const publicBracketSubtitle = { color: "#cbd5e1", fontSize: 13, fontWeight: 800, marginTop: 5 };
const publicBracketScroll = { margin: "0 -16px -16px", overflowX: "auto", padding: "0 16px 16px" };
const publicBracketPath = { alignItems: "stretch", display: "flex", gap: 0, minWidth: "max-content" };
const publicBracketNode = { alignItems: "center", display: "flex" };
const publicBracketConnector = { alignItems: "center", display: "flex", flex: "0 0 auto", height: "100%", padding: "0 4px", width: 46 };
const publicBracketConnectorDot = { background: "#86efac", border: "3px solid #14532d", borderRadius: 999, boxShadow: "0 0 0 4px rgba(134,239,172,0.16)", height: 10, width: 10 };
const publicBracketConnectorLine = { background: "linear-gradient(90deg, #86efac, rgba(134,239,172,0.18))", borderRadius: 999, flex: 1, height: 4 };
const publicBracketCard = { background: "linear-gradient(180deg, #ffffff, #f8fafc)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: 18, boxShadow: "0 14px 28px rgba(0,0,0,0.18)", display: "grid", flex: "0 0 292px", gap: 9, minHeight: 214, padding: 14, position: "relative" };
const publicBracketTop = { alignItems: "flex-start", display: "flex", gap: 10, justifyContent: "space-between" };
const publicBracketGame = { color: "#0f172a", fontSize: 15, fontWeight: 900 };
const publicBracketMeta = { color: "#64748b", fontSize: 12, fontWeight: 800, marginTop: 3 };
const publicBracketStatus = { borderRadius: 999, fontSize: 11, fontWeight: 900, padding: "5px 8px", textTransform: "uppercase" };
const publicBracketFinal = { background: "#dcfce7", color: "#166534" };
const publicBracketScheduled = { background: "#dbeafe", color: "#1d4ed8" };
const publicBracketTeam = { alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, display: "grid", gap: 10, gridTemplateColumns: "minmax(0, 1fr) auto", padding: "10px 11px" };
const publicBracketTeamWinner = { background: "#ecfdf5", borderColor: "#16a34a", boxShadow: "inset 4px 0 0 #16a34a" };
const publicBracketTeamName = { alignItems: "center", color: "#111827", display: "flex", fontSize: 15, fontWeight: 900, gap: 8, minWidth: 0, overflowWrap: "anywhere" };
const publicBracketLogo = { height: 30, objectFit: "contain", width: 30 };
const publicBracketScore = { color: "#111827", fontSize: 24, fontVariantNumeric: "tabular-nums", fontWeight: 900 };
const publicBracketWinner = { background: "#f1f5f9", borderRadius: 999, color: "#64748b", fontSize: 12, fontWeight: 900, justifySelf: "start", padding: "7px 10px" };
const publicBracketWinnerReady = { background: "#dcfce7", color: "#166534" };
