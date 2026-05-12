import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Mail,
  Printer,
  Sheet,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "../../supabase";
import { applyPersonSeasonFilter, applyUuidSeasonFilter, getActiveSeason } from "../../utils/season";

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

const GAME_PAY = 20;
const HEAD_REF_WEEKLY = 20;

const REPORT_TYPES = [
  {
    id: "team_rosters",
    title: "Team Rosters",
    desc: "Printable roster pages by team with coach and player details.",
    icon: Users,
  },
  {
    id: "team_schedules",
    title: "Team Schedules",
    desc: "Print or email schedules to coaches by team and week.",
    icon: CalendarDays,
  },
  {
    id: "coach_packet",
    title: "Coach Packet",
    desc: "Complete packet with roster, schedule, and coach contacts.",
    icon: FileText,
  },
  {
    id: "all_refs",
    title: "All Referee Payments",
    desc: "County-ready payment report for every referee.",
    icon: Users,
  },
  {
    id: "timesheets",
    title: "County Timesheets",
    desc: "One printable payment timesheet page per referee.",
    icon: Sheet,
  },
  {
    id: "weekly",
    title: "Weekly Payment Summary",
    desc: "Review all referee payments by selected week.",
    icon: CalendarDays,
  },
  {
    id: "referee",
    title: "Individual Referee Report",
    desc: "Pull one referee across all weeks or a single week.",
    icon: UserRound,
  },
];

const REF_REPORT_TYPES = new Set(["all_refs", "timesheets", "weekly", "referee"]);
const TEAM_REPORT_TYPES = new Set(["team_rosters", "team_schedules", "coach_packet"]);

export default function ReportsPage() {
  const [reportType, setReportType] = useState(null);
  const [refs, setRefs] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [teams, setTeams] = useState([]);
  const [nflTeams, setNflTeams] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefId, setSelectedRefId] = useState("all");
  const [selectedTeamId, setSelectedTeamId] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [includeParentsInEmail, setIncludeParentsInEmail] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const active = await getActiveSeason();

    const { data: refData, error: refError } = await applyPersonSeasonFilter(supabase
      .from("referees")
      .select("*")
      .order("last_name", { ascending: true }), active);

    const { data: checkinData, error: checkinError } = await supabase
      .from("ref_checkins")
      .select(`
        *,
        schedule_master_auto!game_id (
          id,
          week,
          division,
          team,
          opponent,
          event_date,
          event_time,
          time,
          field
        )
      `);

    const { data: teamData, error: teamError } = await applyPersonSeasonFilter(supabase
      .from("teams")
      .select("*"), active);

    const { data: nflData, error: nflError } = await supabase
      .from("nfl_teams")
      .select("*");

    const { data: coachData, error: coachError } = await applyPersonSeasonFilter(supabase
      .from("coaches")
      .select("*"), active);

    const { data: playerData, error: playerError } = await applyPersonSeasonFilter(supabase
      .from("players")
      .select("*, divisions(name)")
      .order("last_name", { ascending: true }), active);

    const { data: scheduleData, error: scheduleError } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("*")
      .or("event_type.ilike.%game%,event_type.ilike.%champ%")
      .order("week", { ascending: true })
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true }), active);

    if (refError || checkinError || teamError || nflError || coachError || playerError || scheduleError) {
      console.error("Report load error:", refError || checkinError || teamError || nflError || coachError || playerError || scheduleError);
      setStatus("Could not load report data. Check the console for details.");
    }

    setRefs(refData || []);
    setCheckins(checkinData || []);
    setTeams(teamData || []);
    setNflTeams(nflData || []);
    setCoaches(coachData || []);
    setPlayers(playerData || []);
    setSchedule(scheduleData || []);
    setLoading(false);
  };

  const weeks = useMemo(() => {
    return [
      ...new Set(
        [
          ...checkins.map((c) => c.schedule_master_auto?.week),
          ...schedule.map((game) => game.week),
        ]
          .filter((week) => week !== null && week !== undefined)
      ),
    ].sort((a, b) => Number(a) - Number(b));
  }, [checkins, schedule]);

  const nflById = useMemo(() => {
    const map = {};
    nflTeams.forEach((team) => {
      map[team.id] = team;
    });
    return map;
  }, [nflTeams]);

  const teamCards = useMemo(() => (
    teams.map((team) => {
      const nfl = nflById[team.nfl_team_id] || {};
      const teamPlayers = players.filter((player) => player.team_id === team.id);
      const headCoach = coaches.find((coach) => coach.id === team.coach_id);
      const assistantCoach = coaches.find((coach) => coach.id === team.assistant_coach_id);

      return {
        ...team,
        name: nfl.full_name || nfl.short_name || "Unnamed Team",
        shortName: nfl.short_name || nfl.full_name || "Team",
        logo: getTeamLogo(nfl),
        coachName: getPersonName(headCoach),
        coachEmail: headCoach?.email || "",
        coachPhone: headCoach?.phone || "",
        coachNotes: headCoach?.notes || "",
        assistantName: getPersonName(assistantCoach),
        assistantEmail: assistantCoach?.email || "",
        assistantPhone: assistantCoach?.phone || "",
        players: teamPlayers,
      };
    }).sort((a, b) => (
      String(a.division || "").localeCompare(String(b.division || "")) || a.name.localeCompare(b.name)
    ))
  ), [coaches, nflById, players, teams]);

  const selectedTeams = useMemo(() => (
    selectedTeamId === "all"
      ? teamCards
      : teamCards.filter((team) => team.id === selectedTeamId)
  ), [selectedTeamId, teamCards]);

  const teamScheduleRows = useMemo(() => {
    const selectedNames = new Set(selectedTeams.flatMap((team) => [
      normalizeTeamKey(team.name),
      normalizeTeamKey(team.shortName),
    ]));

    return schedule
      .filter((game) => selectedTeamId === "all" || (
        selectedNames.has(normalizeTeamKey(game.team)) ||
        selectedNames.has(normalizeTeamKey(game.opponent))
      ))
      .filter((game) => selectedWeek === "all" || String(game.week) === String(selectedWeek))
      .sort((a, b) => (
        Number(a.week || 0) - Number(b.week || 0) ||
        String(a.event_date || "").localeCompare(String(b.event_date || "")) ||
        timeToMinutes(a.event_time || a.time) - timeToMinutes(b.event_time || b.time)
      ));
  }, [schedule, selectedTeamId, selectedTeams, selectedWeek]);

  const reportRows = useMemo(() => {
    return checkins
      .map((checkin) => {
        const ref = refs.find((r) => r.id === checkin.ref_id);
        const game = checkin.schedule_master_auto;
        const isHeadRef = ref?.role === "Head Ref" || ref?.is_head_ref;

        return {
          id: checkin.id,
          refId: checkin.ref_id,
          refName: ref ? `${ref.first_name || ""} ${ref.last_name || ""}`.trim() : "Unknown Referee",
          refEmail: ref?.email || "",
          refPhone: formatPhone(ref?.phone),
          refRole: ref?.role || "Assistant Ref",
          isHeadRef,
          week: game?.week ?? "Unknown",
          date: game?.event_date || "Unknown",
          time: game?.event_time || game?.time || "",
          division: game?.division || "",
          matchup: `${game?.team || "Team"} vs ${game?.opponent || "Opponent"}`,
          field: game?.field || "",
          gamePay: Number(checkin.pay || GAME_PAY),
          paid: Boolean(checkin.paid),
        };
      })
      .filter((row) => selectedRefId === "all" || row.refId === selectedRefId)
      .filter((row) => selectedWeek === "all" || String(row.week) === String(selectedWeek))
      .sort((a, b) => {
        const weekDiff = Number(a.week || 0) - Number(b.week || 0);
        if (weekDiff !== 0) return weekDiff;
        return `${a.date} ${a.time} ${a.refName}`.localeCompare(`${b.date} ${b.time} ${b.refName}`);
      });
  }, [checkins, refs, selectedRefId, selectedWeek]);

  const refGroups = useMemo(() => {
    const map = {};

    reportRows.forEach((row) => {
      if (!map[row.refId]) {
        map[row.refId] = {
          refName: row.refName,
          refEmail: row.refEmail,
          refPhone: row.refPhone,
          refRole: row.refRole,
          isHeadRef: row.isHeadRef,
          weeks: {},
        };
      }

      if (!map[row.refId].weeks[row.week]) {
        map[row.refId].weeks[row.week] = [];
      }

      map[row.refId].weeks[row.week].push(row);
    });

    return map;
  }, [reportRows]);

  const totals = useMemo(() => {
    let games = 0;
    let gamePay = 0;
    let headRefPay = 0;
    let paid = 0;
    let unpaid = 0;

    Object.values(refGroups).forEach((refGroup) => {
      Object.values(refGroup.weeks).forEach((rows) => {
        const weekGamePay = rows.reduce((sum, row) => sum + row.gamePay, 0);
        const weekHeadPay = refGroup.isHeadRef && rows.length ? HEAD_REF_WEEKLY : 0;
        const weekTotal = weekGamePay + weekHeadPay;
        const weekPaid = rows.every((row) => row.paid);

        games += rows.length;
        gamePay += weekGamePay;
        headRefPay += weekHeadPay;
        if (weekPaid) paid += weekTotal;
        else unpaid += weekTotal;
      });
    });

    return {
      games,
      gamePay,
      headRefPay,
      total: gamePay + headRefPay,
      paid,
      unpaid,
    };
  }, [refGroups]);

  const activeReport = REPORT_TYPES.find((report) => report.id === reportType);
  const selectedTeam = teamCards.find((team) => team.id === selectedTeamId);

  const selectReportType = (id) => {
    setReportType(id);
    setStatus("");
    setSelectedRefId(id === "referee" ? refs[0]?.id || "all" : "all");
    setSelectedTeamId("all");
    setSelectedWeek("all");
  };

  const reportTitle = activeReport?.title || "Referee Payment Report";
  const reportSubtitle = [
    selectedWeek === "all" ? "All Weeks" : `Week ${selectedWeek}`,
    selectedRefId === "all"
      ? "All Referees"
      : refs.find((ref) => ref.id === selectedRefId)
        ? `${refs.find((ref) => ref.id === selectedRefId).first_name || ""} ${refs.find((ref) => ref.id === selectedRefId).last_name || ""}`.trim()
        : "Selected Referee",
  ].join(" | ");

  const printReport = () => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setStatus("The browser blocked the PDF window. Allow pop-ups and try again.");
      return;
    }

    if (reportType === "team_rosters") {
      printWindow.document.write(buildTeamRosterPrintHtml({ teams: selectedTeams }));
    } else if (reportType === "team_schedules") {
      printWindow.document.write(buildTeamSchedulePrintHtml({ teams: selectedTeams, games: teamScheduleRows, week: selectedWeek }));
    } else if (reportType === "coach_packet") {
      printWindow.document.write(buildCoachPacketPrintHtml({ teams: selectedTeams, games: teamScheduleRows, week: selectedWeek }));
    } else {
      printWindow.document.write(
        reportType === "timesheets"
          ? buildTimesheetPrintHtml({ title: reportTitle, subtitle: reportSubtitle, totals, refGroups })
          : buildPrintHtml({ title: reportTitle, subtitle: reportSubtitle, totals, refGroups })
      );
    }
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const emailSelectedCoach = () => {
    const teamsToEmail = selectedTeam ? [selectedTeam] : selectedTeams;

    if (!teamsToEmail.length) {
      setStatus("No teams match this report filter.");
      return;
    }

    const emailLinks = teamsToEmail
      .map((team) => {
        const recipients = [team.coachEmail, team.assistantEmail].filter(Boolean);
        if (!recipients.length) return null;

        const parentEmails = includeParentsInEmail
          ? [...new Set(team.players.map((player) => player.parent_email).filter(Boolean))]
          : [];
        const subject = `${team.name} ${activeReport?.title || "Team Report"}`;
        const body = buildCoachEmailBody({
          team,
          games: teamScheduleRows,
          reportType,
          week: selectedWeek,
        });

        const bcc = parentEmails.length ? `&bcc=${encodeURIComponent(parentEmails.join(","))}` : "";
        return `mailto:${recipients.join(",")}?subject=${encodeURIComponent(subject)}${bcc}&body=${encodeURIComponent(body)}`;
      })
      .filter(Boolean);

    if (!emailLinks.length) {
      setStatus("No coach emails are saved for the selected teams.");
      return;
    }

    emailLinks.slice(0, 8).forEach((link, index) => {
      setTimeout(() => {
        if (index === 0) window.location.href = link;
        else window.open(link, "_blank");
      }, index * 300);
    });

    setStatus(
      emailLinks.length > 8
        ? "Opened the first 8 team email drafts. Select smaller groups if your browser blocks the rest."
        : `Opened ${emailLinks.length} team email draft${emailLinks.length === 1 ? "" : "s"}.`
    );
  };

  if (loading) {
    return <div style={wrap}>Loading reports...</div>;
  }

  return (
    <div style={wrap}>
      {!reportType && (
        <>
          <div style={pageHeader}>
            <div>
              <h1 style={title}>Reports</h1>
              <div style={subtitle}>Choose a report type, then print, save, or email clean league packets.</div>
            </div>
          </div>

          <div style={reportTypeGrid}>
            {REPORT_TYPES.map((report) => {
              const Icon = report.icon;

              return (
                <button
                  key={report.id}
                  style={reportTile}
                  onClick={() => selectReportType(report.id)}
                >
                  <Icon size={28} color="#166534" />
                  <div style={reportTileTitle}>{report.title}</div>
                  <div style={reportTileDesc}>{report.desc}</div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {reportType && (
        <>
          <div style={pageHeader}>
            <button style={backBtn} onClick={() => setReportType(null)}>
              <ArrowLeft size={18} />
              Reports
            </button>

            <div>
              <h1 style={title}>{activeReport?.title}</h1>
              <div style={subtitle}>
                {TEAM_REPORT_TYPES.has(reportType)
                  ? "Select a team and week, then print or email the coach packet."
                  : reportType === "timesheets"
                  ? "Print one county payment timesheet page per referee."
                  : "Select referee and week filters before printing the PDF."}
              </div>
            </div>
          </div>

          <div style={wizardCard}>
            {REF_REPORT_TYPES.has(reportType) && (
              <div style={filterGrid}>
              <label style={fieldGroup}>
                <span style={fieldLabel}>Referee</span>
                <select
                  style={select}
                  value={selectedRefId}
                  onChange={(e) => setSelectedRefId(e.target.value)}
                >
                  {reportType !== "referee" && <option value="all">All Referees</option>}
                  {refs.map((ref) => (
                    <option key={ref.id} value={ref.id}>
                      {ref.first_name} {ref.last_name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldGroup}>
                <span style={fieldLabel}>Week</span>
                <select
                  style={select}
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                >
                  <option value="all">All Weeks</option>
                  {weeks.map((week) => (
                    <option key={week} value={week}>
                      Week {week}
                    </option>
                  ))}
                </select>
              </label>

              <button style={printBtn} onClick={printReport}>
                <Printer size={18} />
                Print / Save PDF
              </button>
            </div>
            )}

            {TEAM_REPORT_TYPES.has(reportType) && (
              <div style={filterGrid}>
                <label style={fieldGroup}>
                  <span style={fieldLabel}>Team</span>
                  <select
                    style={select}
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="all">All Teams</option>
                    {teamCards.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.division} - {team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={fieldGroup}>
                  <span style={fieldLabel}>Week</span>
                  <select
                    style={select}
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                  >
                    <option value="all">All Weeks</option>
                    {weeks.map((week) => (
                      <option key={week} value={week}>
                        Week {week}
                      </option>
                    ))}
                  </select>
                </label>

                <button style={printBtn} onClick={printReport}>
                  <Printer size={18} />
                  Print / Save PDF
                </button>

                <button style={emailBtn} onClick={emailSelectedCoach}>
                  <Mail size={18} />
                  {selectedTeam ? "Email Team" : "Email All Teams"}
                </button>

                <label style={checkLabel}>
                  <input
                    type="checkbox"
                    checked={includeParentsInEmail}
                    onChange={(e) => setIncludeParentsInEmail(e.target.checked)}
                  />
                  Include parent emails as BCC
                </label>
              </div>
            )}

            {status && <div style={errorBanner}>{status}</div>}
          </div>

          {REF_REPORT_TYPES.has(reportType) && (
            <>
            <div style={statsGrid}>
            <StatTile label="Games Worked" value={totals.games} />
            <StatTile label="Game Pay" value={`$${totals.gamePay}`} />
            <StatTile label="Head Ref Pay" value={`$${totals.headRefPay}`} />
            <StatTile label="Total Due" value={`$${totals.total}`} />
            <StatTile label="Paid" value={`$${totals.paid}`} />
            <StatTile label="Unpaid" value={`$${totals.unpaid}`} />
          </div>

          <div style={previewCard}>
            <div style={previewHeader}>
              <FileText size={22} color="#166534" />
              <div>
                <div style={previewTitle}>{reportTitle}</div>
                <div style={previewSub}>{reportSubtitle}</div>
              </div>
            </div>

            {reportRows.length === 0 && (
              <div style={empty}>No referee payment rows match these filters.</div>
            )}

            {Object.entries(refGroups).map(([refId, refGroup]) => (
              <div key={refId} style={refSection}>
                <div style={refHeader}>
                  <div>
                    <div style={refName}>{refGroup.refName}</div>
                    <div style={refMeta}>
                      {refGroup.refRole}
                      {refGroup.refEmail ? ` | ${refGroup.refEmail}` : ""}
                      {refGroup.refPhone ? ` | ${refGroup.refPhone}` : ""}
                    </div>
                  </div>
                  <div style={refTotal}>${getRefTotal(refGroup)}</div>
                </div>

                {Object.entries(refGroup.weeks).map(([week, rows]) => (
                  <div key={week} style={weekBlock}>
                    <div style={weekTitle}>
                      Week {week}
                      <span>${getWeekTotal(refGroup, rows)}</span>
                    </div>

                    {rows.map((row) => (
                      <div key={row.id} style={gameRow}>
                        <span>{row.date} {row.time}</span>
                        <span>{row.division}</span>
                        <span>{row.matchup}</span>
                        <span>${row.gamePay}</span>
                      </div>
                    ))}

                    {refGroup.isHeadRef && rows.length > 0 && (
                      <div style={gameRow}>
                        <span>Weekly Head Ref Stipend</span>
                        <span />
                        <span />
                        <span>${HEAD_REF_WEEKLY}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
            </>
          )}

          {TEAM_REPORT_TYPES.has(reportType) && (
            <>
              <div style={statsGrid}>
                <StatTile label="Teams" value={selectedTeams.length} />
                <StatTile label="Players" value={selectedTeams.reduce((sum, team) => sum + team.players.length, 0)} />
                <StatTile label="Games" value={teamScheduleRows.length} />
                <StatTile label="Week" value={selectedWeek === "all" ? "All" : selectedWeek} />
              </div>

              <div style={previewCard}>
                <div style={previewHeader}>
                  <FileText size={22} color="#166534" />
                  <div>
                    <div style={previewTitle}>{activeReport?.title}</div>
                    <div style={previewSub}>
                      {selectedTeam ? `${selectedTeam.division} - ${selectedTeam.name}` : "All Teams"} | {selectedWeek === "all" ? "All Weeks" : `Week ${selectedWeek}`}
                    </div>
                  </div>
                </div>

                {selectedTeams.map((team) => (
                  <div key={team.id} style={refSection}>
                    <div style={refHeader}>
                      <div style={teamReportHeader}>
                        {team.logo && <img src={team.logo} alt="" style={teamReportLogo} />}
                        <div>
                        <div style={refName}>{team.name}</div>
                        <div style={refMeta}>
                          {team.division} | Coach: {team.coachName || "-"}
                          {team.coachEmail ? ` | ${team.coachEmail}` : ""}
                          {team.coachPhone ? ` | ${formatPhone(team.coachPhone)}` : ""}
                        </div>
                      </div>
                      </div>
                      <div style={refTotal}>{team.players.length}</div>
                    </div>

                    {(reportType === "team_rosters" || reportType === "coach_packet") && (
                      <div style={weekBlock}>
                        <div style={weekTitle}>Roster <span>{team.players.length} players</span></div>
                        {team.players.map((player) => (
                          <div key={player.id} style={gameRow}>
                            <span>{player.first_name} {player.last_name}</span>
                            <span>Age {player.age || "-"}</span>
                            <span>Grade {player.grade || "-"}</span>
                            <span>{player.shirt_size || "Size -"}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(reportType === "team_schedules" || reportType === "coach_packet") && (
                      <div style={weekBlock}>
                        <div style={weekTitle}>Schedule <span>{getTeamGames(team, teamScheduleRows).length} games</span></div>
                        {getTeamGames(team, teamScheduleRows).map((game) => (
                          <div key={game.id} style={gameRow}>
                            <span>Week {game.week || "-"}</span>
                            <span>{game.event_date || "Date TBD"} {game.event_time || game.time || ""}</span>
                            <span>{game.team} vs {game.opponent}</span>
                            <span>{game.field || "Field TBD"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function getWeekTotal(refGroup, rows) {
  const gamePay = rows.reduce((sum, row) => sum + row.gamePay, 0);
  return gamePay + (refGroup.isHeadRef && rows.length ? HEAD_REF_WEEKLY : 0);
}

function getRefTotal(refGroup) {
  return Object.values(refGroup.weeks).reduce((sum, rows) => (
    sum + getWeekTotal(refGroup, rows)
  ), 0);
}

function getPersonName(person) {
  if (!person) return "";
  return `${person.first_name || ""} ${person.last_name || ""}`.trim();
}

function cleanTeamName(value) {
  return (value || "").toString().replace(/\s+/g, " ").trim();
}

function normalizeTeamKey(value) {
  return cleanTeamName(value)
    .toLowerCase()
    .replace(/^(san francisco|kansas city|cincinnati|buffalo|denver|detroit|indianapolis|las vegas|los angeles|new york|philadelphia|pittsburgh|baltimore)\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatPhone(value) {
  if (!value) return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return String(value);
}

function timeToMinutes(value) {
  if (!value) return 99999;
  const text = value.toString().trim().toUpperCase();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);
  if (!match) return 99999;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = match[3];
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function getTeamGames(team, games) {
  const names = new Set([normalizeTeamKey(team.name), normalizeTeamKey(team.shortName)]);
  return games.filter((game) => (
    names.has(normalizeTeamKey(game.team)) ||
    names.has(normalizeTeamKey(game.opponent))
  ));
}

function getTeamLogo(team) {
  if (!team) return "";
  if (team.logo && /^https?:\/\//i.test(team.logo)) return team.logo;

  const shortName = cleanTeamName(team.short_name).toLowerCase();
  const fullName = cleanTeamName(team.full_name).toLowerCase();

  if (shortName.includes("49") || fullName.includes("49")) return TEAM_LOGOS["49ers"];
  return TEAM_LOGOS[shortName] || TEAM_LOGOS[fullName] || "";
}

function buildCoachEmailBody({ team, games, reportType, week }) {
  const teamGames = getTeamGames(team, games);
  const header = reportType === "team_rosters"
    ? "Team roster"
    : reportType === "coach_packet"
      ? "Coach packet"
      : "Team schedule";

  const rosterLines = team.players.map((player) => (
    `- ${player.first_name || ""} ${player.last_name || ""} | Age ${player.age || "-"} | Grade ${player.grade || "-"}${player.parent_phone ? ` | Parent phone ${formatPhone(player.parent_phone)}` : ""}`
  ));

  const scheduleLines = teamGames.map((game) => (
    `- Week ${game.week || "-"} | ${game.event_date || "Date TBD"} ${game.event_time || game.time || ""} | ${game.team} vs ${game.opponent} | ${game.field || "Field TBD"}`
  ));

  return [
    `${header} for ${team.name}`,
    `${team.division || ""}${week === "all" ? "" : ` | Week ${week}`}`,
    "",
    "Roster:",
    ...(rosterLines.length ? rosterLines : ["No players assigned yet."]),
    "",
    "Schedule:",
    ...(scheduleLines.length ? scheduleLines : ["No games found for this filter."]),
    "",
    "Fallon Football",
  ].join("\n");
}

function StatTile({ label, value }) {
  return (
    <div style={statTile}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildTeamRosterPrintHtml({ teams }) {
  return buildTeamPacketHtml({
    title: "Team Roster Report",
    teams,
    games: [],
    mode: "roster",
  });
}

function buildTeamSchedulePrintHtml({ teams, games, week }) {
  return buildTeamPacketHtml({
    title: "Team Schedule Report",
    subtitle: week === "all" ? "All Weeks" : `Week ${week}`,
    teams,
    games,
    mode: "schedule",
  });
}

function buildCoachPacketPrintHtml({ teams, games, week }) {
  return buildTeamPacketHtml({
    title: "Coach Packet",
    subtitle: week === "all" ? "All Weeks" : `Week ${week}`,
    teams,
    games,
    mode: "packet",
  });
}

function buildTeamPacketHtml({ title, subtitle = "", teams, games, mode }) {
  const pages = teams.map((team) => {
    const teamGames = getTeamGames(team, games);
    const rosterRows = team.players.map((player) => `
      <tr>
        <td>${escapeHtml(`${player.first_name || ""} ${player.last_name || ""}`.trim())}</td>
        <td>${escapeHtml(player.age || "")}</td>
        <td>${escapeHtml(player.grade || "")}</td>
        <td>${escapeHtml(player.parent_name || "")}</td>
        <td>${escapeHtml(formatPhone(player.parent_phone))}</td>
        <td>${escapeHtml(player.shirt_size || "")}</td>
      </tr>
    `).join("");

    const scheduleRows = teamGames.map((game) => `
      <tr>
        <td>${escapeHtml(game.week || "")}</td>
        <td>${escapeHtml(game.event_date || "Date TBD")}</td>
        <td>${escapeHtml(game.event_time || game.time || "")}</td>
        <td>${escapeHtml(`${game.team || "Team"} vs ${game.opponent || "Opponent"}`)}</td>
        <td>${escapeHtml(game.field || "Field TBD")}</td>
      </tr>
    `).join("");

    return `
      <section class="packet-page">
        <header class="packet-header">
          <div class="team-title">
            ${team.logo ? `<img src="${escapeHtml(team.logo)}" alt="" />` : ""}
            <div>
            <div class="league">Fallon Football</div>
            <h1>${escapeHtml(team.name)}</h1>
            <div class="subtitle">${escapeHtml(team.division || "")}${subtitle ? ` | ${escapeHtml(subtitle)}` : ""}</div>
          </div>
          </div>
          <div class="coach-box">
            <span>Coach</span>
            <strong>${escapeHtml(team.coachName || "-")}</strong>
            <small>${escapeHtml(team.coachEmail || "")}</small>
            <small>${escapeHtml(formatPhone(team.coachPhone))}</small>
          </div>
        </header>

        ${(mode === "roster" || mode === "packet") ? `
          <section class="section">
            <h2>Roster</h2>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Age</th>
                  <th>Grade</th>
                  <th>Parent</th>
                  <th>Phone</th>
                  <th>Shirt</th>
                </tr>
              </thead>
              <tbody>
                ${rosterRows || '<tr><td colspan="6">No players assigned.</td></tr>'}
              </tbody>
            </table>
          </section>
        ` : ""}

        ${(mode === "schedule" || mode === "packet") ? `
          <section class="section">
            <h2>Schedule</h2>
            <table>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Game</th>
                  <th>Field</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRows || '<tr><td colspan="5">No games found.</td></tr>'}
              </tbody>
            </table>
          </section>
        ` : ""}

        ${mode === "packet" ? `
          <section class="notes">
            <h2>Coach Notes</h2>
            <div class="note-box">${escapeHtml(team.coachNotes || "No coach notes saved.")}</div>
          </section>
        ` : ""}
      </section>
    `;
  }).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { color: #111827; font-family: Arial, Helvetica, sans-serif; margin: 0; }
          .packet-page { min-height: 10in; padding: 0.3in; page-break-after: always; width: 7.9in; }
          .packet-page:last-child { page-break-after: auto; }
          .packet-header { align-items: flex-start; border-bottom: 2px solid #166534; display: flex; justify-content: space-between; gap: 18px; padding-bottom: 12px; }
          .team-title { align-items: center; display: flex; gap: 10px; min-width: 0; }
          .team-title img { height: 44px; object-fit: contain; width: 44px; }
          .league { color: #166534; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
          h1 { font-size: 22px; margin: 3px 0 4px; }
          h2 { font-size: 14px; margin: 0 0 8px; }
          .subtitle { color: #475569; font-size: 11px; }
          .coach-box { border: 1px solid #cbd5e1; border-radius: 8px; min-width: 170px; padding: 9px; text-align: right; }
          .coach-box span { color: #64748b; display: block; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
          .coach-box strong { display: block; font-size: 13px; margin-top: 4px; }
          .coach-box small { color: #64748b; display: block; font-size: 10px; margin-top: 3px; }
          .section { margin-top: 14px; }
          table { border-collapse: collapse; font-size: 10.5px; table-layout: fixed; width: 100%; }
          th { background: #ecfdf5; color: #14532d; font-size: 8.5px; letter-spacing: 0.04em; text-align: left; text-transform: uppercase; }
          th, td { border: 1px solid #cbd5e1; overflow-wrap: anywhere; padding: 5px 6px; }
          .notes { margin-top: 14px; }
          .note-box { border: 1px solid #cbd5e1; border-radius: 8px; font-size: 11px; min-height: 70px; padding: 9px; white-space: pre-wrap; }
          @media print {
            @page { margin: 0.25in; size: letter portrait; }
            body { margin: 0; }
            .packet-page { min-height: 10.5in; padding: 0; width: 8in; }
          }
        </style>
      </head>
      <body>
        ${pages || '<section class="packet-page">No teams match this filter.</section>'}
      </body>
    </html>
  `;
}

function buildPrintHtml({ title, subtitle, totals, refGroups }) {
  const refSections = Object.entries(refGroups).map(([, refGroup]) => {
    const weekRows = Object.entries(refGroup.weeks).map(([week, rows]) => {
      const games = rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.date)}</td>
          <td>${escapeHtml(row.time)}</td>
          <td>${escapeHtml(row.division)}</td>
          <td>${escapeHtml(row.matchup)}</td>
          <td>${escapeHtml(row.field)}</td>
          <td class="money">$${row.gamePay}</td>
        </tr>
      `).join("");

      const stipend = refGroup.isHeadRef && rows.length ? `
        <tr>
          <td colspan="5">Weekly Head Ref Stipend</td>
          <td class="money">$${HEAD_REF_WEEKLY}</td>
        </tr>
      ` : "";

      return `
        <section class="week">
          <div class="week-title">
            <span>Week ${escapeHtml(week)}</span>
            <span>$${getWeekTotal(refGroup, rows)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Division</th>
                <th>Game</th>
                <th>Field</th>
                <th>Pay</th>
              </tr>
            </thead>
            <tbody>
              ${games}
              ${stipend}
            </tbody>
          </table>
        </section>
      `;
    }).join("");

    return `
      <section class="ref-section">
        <div class="ref-header">
          <div>
            <h2>${escapeHtml(refGroup.refName)}</h2>
            <p>${escapeHtml(refGroup.refRole)}${refGroup.refEmail ? ` | ${escapeHtml(refGroup.refEmail)}` : ""}${refGroup.refPhone ? ` | ${escapeHtml(refGroup.refPhone)}` : ""}</p>
          </div>
          <div class="ref-total">$${getRefTotal(refGroup)}</div>
        </div>
        ${weekRows}
      </section>
    `;
  }).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            margin: 36px;
          }

          .report-header {
            border-bottom: 3px solid #166534;
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 18px;
          }

          h1 {
            font-size: 26px;
            margin: 0 0 6px;
          }

          .subtitle,
          .issued {
            color: #475569;
            font-size: 13px;
          }

          .summary {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(6, 1fr);
            margin: 22px 0;
          }

          .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
          }

          .summary-value {
            font-size: 18px;
            font-weight: 800;
          }

          .summary-label {
            color: #64748b;
            font-size: 10px;
            margin-top: 2px;
            text-transform: uppercase;
          }

          .ref-section {
            border: 1px solid #dbe4ee;
            border-radius: 10px;
            margin: 18px 0;
            overflow: hidden;
            page-break-inside: avoid;
          }

          .ref-header {
            align-items: center;
            background: #f1f5f9;
            display: flex;
            justify-content: space-between;
            padding: 14px 16px;
          }

          h2 {
            font-size: 18px;
            margin: 0;
          }

          p {
            color: #475569;
            font-size: 12px;
            margin: 4px 0 0;
          }

          .ref-total {
            color: #166534;
            font-size: 22px;
            font-weight: 800;
          }

          .week {
            padding: 12px 16px 16px;
          }

          .week-title {
            color: #111827;
            display: flex;
            font-size: 14px;
            font-weight: 800;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          table {
            border-collapse: collapse;
            font-size: 12px;
            width: 100%;
          }

          th {
            background: #ecfdf5;
            color: #14532d;
            font-size: 10px;
            letter-spacing: 0.04em;
            text-align: left;
            text-transform: uppercase;
          }

          th,
          td {
            border: 1px solid #dbe4ee;
            padding: 7px;
          }

          .money {
            font-weight: 800;
            text-align: right;
          }

          .footer {
            border-top: 1px solid #dbe4ee;
            color: #64748b;
            font-size: 11px;
            margin-top: 24px;
            padding-top: 12px;
          }

          @media print {
            body {
              margin: 24px;
            }
          }
        </style>
      </head>
      <body>
        <header class="report-header">
          <div>
            <h1>${escapeHtml(title)}</h1>
            <div class="subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <div class="issued">Generated ${escapeHtml(new Date().toLocaleDateString())}</div>
        </header>

        <section class="summary">
          <div class="summary-card"><div class="summary-value">${totals.games}</div><div class="summary-label">Games</div></div>
          <div class="summary-card"><div class="summary-value">$${totals.gamePay}</div><div class="summary-label">Game Pay</div></div>
          <div class="summary-card"><div class="summary-value">$${totals.headRefPay}</div><div class="summary-label">Head Ref</div></div>
          <div class="summary-card"><div class="summary-value">$${totals.total}</div><div class="summary-label">Total Due</div></div>
          <div class="summary-card"><div class="summary-value">$${totals.paid}</div><div class="summary-label">Paid</div></div>
          <div class="summary-card"><div class="summary-value">$${totals.unpaid}</div><div class="summary-label">Unpaid</div></div>
        </section>

        ${refSections || '<div class="footer">No referee payment rows match these filters.</div>'}

        <footer class="footer">
          Fallon Football referee payment report for county submission.
        </footer>
      </body>
    </html>
  `;
}

function buildTimesheetPrintHtml({ title, subtitle, totals, refGroups }) {
  const timesheets = Object.entries(refGroups).map(([, refGroup]) => {
    const allRows = Object.entries(refGroup.weeks).flatMap(([week, rows]) => (
      rows.map((row) => ({ ...row, week }))
    ));

    const gameRows = allRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.week)}</td>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.division)}</td>
        <td>${escapeHtml(row.matchup)}</td>
        <td>${escapeHtml(row.field)}</td>
        <td class="money">$${row.gamePay}</td>
      </tr>
    `).join("");

    const headRefWeeks = refGroup.isHeadRef
      ? Object.entries(refGroup.weeks).filter(([, rows]) => rows.length > 0)
      : [];

    const stipendRows = headRefWeeks.map(([week]) => `
      <tr>
        <td>${escapeHtml(week)}</td>
        <td colspan="5">Weekly Head Ref Stipend</td>
        <td class="money">$${HEAD_REF_WEEKLY}</td>
      </tr>
    `).join("");

    return `
      <section class="timesheet">
        <header class="timesheet-header">
          <div>
            <div class="agency">Fallon Football</div>
            <h1>Referee Payment Timesheet</h1>
            <div class="subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <div class="amount-due">
            <span>Total Due</span>
            <strong>$${getRefTotal(refGroup)}</strong>
          </div>
        </header>

        <section class="identity-grid">
          <div><span>Referee</span><strong>${escapeHtml(refGroup.refName)}</strong></div>
          <div><span>Role</span><strong>${escapeHtml(refGroup.refRole)}</strong></div>
          <div><span>Email</span><strong>${escapeHtml(refGroup.refEmail || " ")}</strong></div>
          <div><span>Phone</span><strong>${escapeHtml(refGroup.refPhone || " ")}</strong></div>
        </section>

        <section class="summary-row">
          <div><span>Games</span><strong>${allRows.length}</strong></div>
          <div><span>Game Pay</span><strong>$${allRows.reduce((sum, row) => sum + row.gamePay, 0)}</strong></div>
          <div><span>Head Ref Pay</span><strong>$${headRefWeeks.length * HEAD_REF_WEEKLY}</strong></div>
          <div><span>Total Pay</span><strong>$${getRefTotal(refGroup)}</strong></div>
        </section>

        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Date</th>
              <th>Time</th>
              <th>Division</th>
              <th>Game</th>
              <th>Field</th>
              <th>Pay</th>
            </tr>
          </thead>
          <tbody>
            ${gameRows || '<tr><td colspan="7">No games recorded for this referee.</td></tr>'}
            ${stipendRows}
          </tbody>
        </table>

        <section class="certification">
          <p>I certify the referee services listed above were completed for the stated games and payment amount.</p>
          <div class="signature-grid">
            <div>
              <span>Referee Signature</span>
              <div class="signature-line"></div>
            </div>
            <div>
              <span>County / League Approval</span>
              <div class="signature-line"></div>
            </div>
            <div>
              <span>Date</span>
              <div class="signature-line"></div>
            </div>
          </div>
        </section>
      </section>
    `;
  }).join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
          }

          .timesheet {
            min-height: 100vh;
            padding: 34px;
            page-break-after: always;
          }

          .timesheet:last-child {
            page-break-after: auto;
          }

          .timesheet-header {
            align-items: flex-start;
            border-bottom: 3px solid #111827;
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 16px;
          }

          .agency {
            color: #166534;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          h1 {
            font-size: 26px;
            margin: 4px 0 6px;
          }

          .subtitle {
            color: #475569;
            font-size: 13px;
          }

          .amount-due {
            border: 2px solid #111827;
            min-width: 150px;
            padding: 10px 14px;
            text-align: right;
          }

          .amount-due span,
          .identity-grid span,
          .summary-row span,
          .signature-grid span {
            color: #475569;
            display: block;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }

          .amount-due strong {
            display: block;
            font-size: 28px;
            margin-top: 4px;
          }

          .identity-grid,
          .summary-row {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(4, 1fr);
            margin-top: 18px;
          }

          .identity-grid div,
          .summary-row div {
            border: 1px solid #cbd5e1;
            min-height: 54px;
            padding: 9px 10px;
          }

          .identity-grid strong,
          .summary-row strong {
            display: block;
            font-size: 14px;
            margin-top: 6px;
          }

          .summary-row strong {
            font-size: 18px;
          }

          table {
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 20px;
            width: 100%;
          }

          th {
            background: #f1f5f9;
            font-size: 10px;
            letter-spacing: 0.04em;
            text-align: left;
            text-transform: uppercase;
          }

          th,
          td {
            border: 1px solid #cbd5e1;
            padding: 8px;
          }

          .money {
            font-weight: 800;
            text-align: right;
          }

          .certification {
            border-top: 1px solid #cbd5e1;
            margin-top: 28px;
            padding-top: 16px;
          }

          .certification p {
            color: #334155;
            font-size: 12px;
            margin: 0 0 24px;
          }

          .signature-grid {
            display: grid;
            gap: 18px;
            grid-template-columns: 1.2fr 1.2fr 0.8fr;
          }

          .signature-line {
            border-bottom: 1px solid #111827;
            height: 36px;
          }

          @media print {
            @page {
              margin: 0.35in;
            }

            .timesheet {
              min-height: auto;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${timesheets || '<section class="timesheet">No referee payment rows match these filters.</section>'}
      </body>
    </html>
  `;
}

const wrap = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
  padding: 20,
};

const pageHeader = {
  alignItems: "center",
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  justifyContent: "space-between",
};

const title = {
  fontSize: 28,
  fontWeight: 800,
  margin: 0,
};

const subtitle = {
  color: "#64748b",
  fontSize: 14,
  marginTop: 4,
};

const reportTypeGrid = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

const reportTile = {
  alignItems: "flex-start",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 160,
  padding: 18,
  textAlign: "left",
};

const reportTileTitle = {
  color: "#111827",
  fontSize: 18,
  fontWeight: 800,
};

const reportTileDesc = {
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.4,
};

const backBtn = {
  alignItems: "center",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  color: "#334155",
  cursor: "pointer",
  display: "flex",
  gap: 8,
  padding: "10px 12px",
};

const wizardCard = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  padding: 16,
};

const filterGrid = {
  alignItems: "end",
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
};

const fieldGroup = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const fieldLabel = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
};

const select = {
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  color: "#111827",
  fontSize: 14,
  padding: "10px 12px",
};

const printBtn = {
  alignItems: "center",
  background: "#166534",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  fontWeight: 800,
  gap: 8,
  justifyContent: "center",
  minHeight: 40,
  padding: "10px 14px",
};

const emailBtn = {
  ...printBtn,
  background: "#0f172a",
};

const checkLabel = {
  alignItems: "center",
  color: "#475569",
  display: "flex",
  fontSize: 13,
  fontWeight: 800,
  gap: 8,
  minHeight: 40,
};

const errorBanner = {
  background: "#fee2e2",
  borderRadius: 8,
  color: "#991b1b",
  fontSize: 13,
  fontWeight: 700,
  marginTop: 12,
  padding: "10px 12px",
};

const statsGrid = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const statTile = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  padding: 16,
};

const statValue = {
  color: "#111827",
  fontSize: 22,
  fontWeight: 800,
};

const statLabel = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 4,
};

const previewCard = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
  padding: 16,
};

const previewHeader = {
  alignItems: "center",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  gap: 10,
  marginBottom: 12,
  paddingBottom: 12,
};

const previewTitle = {
  fontSize: 18,
  fontWeight: 800,
};

const previewSub = {
  color: "#64748b",
  fontSize: 13,
};

const empty = {
  color: "#64748b",
  padding: 18,
  textAlign: "center",
};

const refSection = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  marginTop: 12,
  overflow: "hidden",
};

const refHeader = {
  alignItems: "center",
  background: "#f8fafc",
  display: "flex",
  justifyContent: "space-between",
  padding: 12,
};

const teamReportHeader = {
  alignItems: "center",
  display: "flex",
  gap: 12,
};

const teamReportLogo = {
  height: 42,
  objectFit: "contain",
  width: 42,
};

const refName = {
  fontWeight: 800,
};

const refMeta = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 2,
};

const refTotal = {
  color: "#166534",
  fontSize: 20,
  fontWeight: 800,
};

const weekBlock = {
  padding: 12,
};

const weekTitle = {
  display: "flex",
  fontWeight: 800,
  justifyContent: "space-between",
  marginBottom: 8,
};

const gameRow = {
  alignItems: "center",
  borderTop: "1px solid #e2e8f0",
  display: "grid",
  fontSize: 13,
  gap: 8,
  gridTemplateColumns: "120px 100px 1fr 60px",
  padding: "8px 0",
};
