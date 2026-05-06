import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Printer,
  Sheet,
  UserRound,
  Users,
} from "lucide-react";
import { supabase } from "../../supabase";

const GAME_PAY = 20;
const HEAD_REF_WEEKLY = 20;

const REPORT_TYPES = [
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

export default function ReportsPage() {
  const [reportType, setReportType] = useState(null);
  const [refs, setRefs] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefId, setSelectedRefId] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: refData, error: refError } = await supabase
      .from("referees")
      .select("*")
      .order("last_name", { ascending: true });

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

    if (refError || checkinError) {
      console.error("Report load error:", refError || checkinError);
      setStatus("Could not load report data. Check the console for details.");
    }

    setRefs(refData || []);
    setCheckins(checkinData || []);
    setLoading(false);
  };

  const weeks = useMemo(() => {
    return [
      ...new Set(
        checkins
          .map((c) => c.schedule_master_auto?.week)
          .filter((week) => week !== null && week !== undefined)
      ),
    ].sort((a, b) => Number(a) - Number(b));
  }, [checkins]);

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
          refPhone: ref?.phone || "",
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

  const selectReportType = (id) => {
    setReportType(id);
    setStatus("");
    setSelectedRefId(id === "referee" ? refs[0]?.id || "all" : "all");
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

    printWindow.document.write(
      reportType === "timesheets"
        ? buildTimesheetPrintHtml({ title: reportTitle, subtitle: reportSubtitle, totals, refGroups })
        : buildPrintHtml({ title: reportTitle, subtitle: reportSubtitle, totals, refGroups })
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
              <div style={subtitle}>Choose a report type, then build a county-ready PDF.</div>
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
                {reportType === "timesheets"
                  ? "Print one county payment timesheet page per referee."
                  : "Select referee and week filters before printing the PDF."}
              </div>
            </div>
          </div>

          <div style={wizardCard}>
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

            {status && <div style={errorBanner}>{status}</div>}
          </div>

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
