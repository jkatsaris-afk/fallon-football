import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { applyUuidSeasonFilter, getActiveSeason } from "../../utils/season";

const TIMES = ["9:30", "10:30", "11:30", "12:30"];
const CHAMPIONSHIP_WEEK = "championships";
const CHAMPIONSHIP_AVAILABILITY_WEEK = 999;

const isChampionshipGame = (game) => {
  const eventType = String(game?.event_type || "").toLowerCase();
  const source = String(game?.source || "").toLowerCase();
  return eventType.includes("champ") || source.startsWith("championship");
};

const getWeekLabel = (week) => (
  week === CHAMPIONSHIP_WEEK ? "Championships" : week
);

const sortWeekValues = (a, b) => {
  const orderA = a === CHAMPIONSHIP_WEEK ? 999 : Number(a) || 0;
  const orderB = b === CHAMPIONSHIP_WEEK ? 999 : Number(b) || 0;
  if (orderA !== orderB) return orderA - orderB;
  return String(a).localeCompare(String(b));
};

const getAvailabilityWeekKey = (week) => (
  week === CHAMPIONSHIP_WEEK ? CHAMPIONSHIP_AVAILABILITY_WEEK : week
);

const normalizeTime = (t) => {
  if (!t) return null;
  const cleaned = t
    .toString()
    .replace(/\s+/g, " ")
    .replace(/\s?AM/i, "")
    .replace(/\s?PM/i, "")
    .trim();

  const match = cleaned.match(/^0?(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return cleaned;

  const hour = String(Number(match[1]));
  const minute = String(Number(match[2] || 0)).padStart(2, "0");
  return `${hour}:${minute}`;
};

const getGameTimeOptions = (game) => {
  const times = [
    game.event_time,
    game.time,
    game.starts_at && new Date(game.starts_at).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
  ];

  return [...new Set(times.map(normalizeTime).filter(Boolean))];
};

const getGameTime = (game) => getGameTimeOptions(game)[0] || null;

const getAvailabilitySlotKey = (game) => {
  const time = getGameTime(game);
  if (!time) return null;
  if (isChampionshipGame(game) && game.event_date) return `${game.event_date}|${time}`;
  return time;
};

const timeToMinutes = (value) => {
  const match = String(value || "").match(/^(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2] || 0);
};

export default function RefAvailabilityPage() {
  const [weeks, setWeeks] = useState([]);
  const [weekDates, setWeekDates] = useState({});
  const [weekSlots, setWeekSlots] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(null);

  const [refId, setRefId] = useState(null);
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    loadWeeks();
    getRefId();
  }, []);

  useEffect(() => {
    if (refId && selectedWeek) {
      loadAvailability();
    }
  }, [refId, selectedWeek]);

  /* ---------------- LOAD ---------------- */

  // ✅ FIXED FUNCTION
  const loadWeeks = async () => {
    const active = await getActiveSeason();
    const { data } = await applyUuidSeasonFilter(supabase
      .from("schedule_master_auto")
      .select("week,event_date,event_time,time,starts_at,event_type,source"), active);

    const regularWeeks = [...new Set((data || [])
      .filter((g) => {
        const eventType = (g.event_type || "").toLowerCase();
        return eventType.includes("game") && !isChampionshipGame(g);
      })
      .map((g) => g.week)
      .filter(Boolean))];
    const hasChampionships = (data || []).some(isChampionshipGame);
    const dateMap = {};
    const slotMap = {};

    (data || []).forEach((game) => {
      const eventType = game.event_type?.toLowerCase() || "";
      if (!eventType.includes("game") && !isChampionshipGame(game)) return;

      const key = isChampionshipGame(game) ? CHAMPIONSHIP_WEEK : game.week;
      if (!key) return;
      if (!dateMap[key]) dateMap[key] = [];
      if (game.event_date) dateMap[key].push(game.event_date);

      const slot = getAvailabilitySlotKey(game);
      if (!slot) return;
      if (!slotMap[key]) slotMap[key] = [];
      if (!slotMap[key].includes(slot)) slotMap[key].push(slot);
    });

    Object.keys(slotMap).forEach((key) => {
      slotMap[key].sort((a, b) => {
        const [dateA, timeA] = String(a).includes("|") ? String(a).split("|") : ["", a];
        const [dateB, timeB] = String(b).includes("|") ? String(b).split("|") : ["", b];
        return String(dateA).localeCompare(String(dateB)) || timeToMinutes(timeA) - timeToMinutes(timeB);
      });
    });

    const sorted = [
      ...regularWeeks.sort(sortWeekValues),
      ...(hasChampionships ? [CHAMPIONSHIP_WEEK] : []),
    ];

    setWeeks(sorted);
    setWeekDates(dateMap);
    setWeekSlots(slotMap);

    if (!selectedWeek && sorted.length) setSelectedWeek(sorted[0]);
    if (selectedWeek && !sorted.includes(selectedWeek)) setSelectedWeek(sorted[0] || null);
  };

  const getRefId = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) return;

    const { data } = await supabase
      .from("referees")
      .select("*")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (data) setRefId(data.id);
  };

  const loadAvailability = async () => {
    const { data } = await supabase
      .from("ref_availability")
      .select("*")
      .eq("referee_id", refId)
      .eq("week", getAvailabilityWeekKey(selectedWeek));

    const map = {};
    data?.forEach((a) => {
      const key = String(a.time_block || "").includes("|") ? a.time_block : normalizeTime(a.time_block);
      map[key] = a.available;
    });

    setAvailability(map);
  };

  /* ---------------- TOGGLE ---------------- */

  const toggle = async (time) => {
    if (!refId || !selectedWeek) return;

    const current = availability?.[time];
    const newValue = current === undefined ? true : !current;

    setAvailability((prev) => ({
      ...prev,
      [time]: newValue,
    }));

    await supabase.from("ref_availability").upsert(
      [
          {
            referee_id: refId,
            week: getAvailabilityWeekKey(selectedWeek),
            time_block: String(time).includes("|") ? time : normalizeTime(time),
            available: newValue,
        },
      ],
      {
        onConflict: "referee_id,week,time_block",
      }
    );
  };

  /* ---------------- BULK ---------------- */

  const setAll = async (value) => {
    const slots = getAvailabilitySlots();
    const updates = {};
    slots.forEach((t) => (updates[t] = value));
    setAvailability(updates);

    for (let t of slots) {
      await supabase.from("ref_availability").upsert(
        [
          {
            referee_id: refId,
            week: getAvailabilityWeekKey(selectedWeek),
            time_block: t,
            available: value,
          },
        ],
        {
          onConflict: "referee_id,week,time_block",
        }
      );
    }
  };

  /* ---------------- NAV ---------------- */

  const currentIndex = weeks.indexOf(selectedWeek);

  const prevWeek = () => {
    if (currentIndex > 0) setSelectedWeek(weeks[currentIndex - 1]);
  };

  const nextWeek = () => {
    if (currentIndex < weeks.length - 1) setSelectedWeek(weeks[currentIndex + 1]);
  };

  /* ---------------- STATS ---------------- */

  const totalSet = Object.keys(availability).length;
  const totalAvailable = Object.values(availability).filter(v => v === true).length;

  const parseDate = (date) => {
    if (!date) return null;
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDate = (date) => date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const formatDateRange = (dates) => {
    const sorted = (dates || [])
      .map(parseDate)
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!sorted.length) return "";
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return first.toDateString() === last.toDateString()
      ? formatDate(first)
      : `${formatDate(first)} - ${formatDate(last)}`;
  };

  const getAvailabilitySlots = () => (
    weekSlots[selectedWeek]?.length ? weekSlots[selectedWeek] : TIMES
  );

  const formatAvailabilitySlot = (slot) => {
    if (!slot) return "";
    const [date, time] = String(slot).includes("|") ? String(slot).split("|") : [null, slot];
    return date ? `${formatDate(parseDate(date))} ${time}` : time;
  };

  /* ---------------- UI ---------------- */

  return (
    <div style={wrap}>

      <div style={header}>My Availability</div>

      <div style={statsGrid}>
        <StatTile label="Set" value={totalSet} />
        <StatTile label="Available" value={totalAvailable} />
      </div>

      <div style={weekTileWrap}>
        <div style={arrowBtn} onClick={prevWeek}>‹</div>

        <div style={weekTile}>
          <div style={weekLabel}>Week</div>
          <div style={weekNumber}>{getWeekLabel(selectedWeek)}</div>
          {formatDateRange(weekDates[selectedWeek]) && (
            <div style={weekDate}>{formatDateRange(weekDates[selectedWeek])}</div>
          )}
        </div>

        <div style={arrowBtn} onClick={nextWeek}>›</div>
      </div>

      <div style={actionRow}>
        <button style={greenBtn} onClick={() => setAll(true)}>
          All Available
        </button>
        <button style={redBtn} onClick={() => setAll(false)}>
          All Unavailable
        </button>
      </div>

      <div style={timeGrid}>
        {getAvailabilitySlots().map((t) => {
          const value = availability?.[t];

          let style = { ...timeTile };
          if (value === true) style = { ...style, ...greenTile };
          if (value === false) style = { ...style, ...redTile };

          return (
            <div key={t} style={style} onClick={() => toggle(t)}>
              {formatAvailabilitySlot(t)}
            </div>
          );
        })}
      </div>

    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function StatTile({ label, value }) {
  return (
    <div style={statCard}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const wrap = {
  padding: 16,
  maxWidth: 700,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: 16
};

const header = {
  fontSize: 24,
  fontWeight: 800,
  textAlign: "center"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 10
};

const statCard = {
  background: "#fff",
  padding: 16,
  borderRadius: 16,
  textAlign: "center",
  boxShadow: "0 6px 20px rgba(0,0,0,0.08)"
};

const statValue = {
  fontSize: 22,
  fontWeight: 800,
  color: "#22c55e"
};

const statLabel = {
  fontSize: 12,
  color: "#64748b"
};

const weekTileWrap = {
  display: "flex",
  alignItems: "center",
  gap: 12
};

const arrowBtn = {
  width: 70,
  height: 70,
  borderRadius: 18,
  background: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const weekTile = {
  flex: 1,
  background: "#fff",
  borderRadius: 18,
  padding: 18,
  textAlign: "center",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const weekLabel = {
  fontSize: 12,
  color: "#64748b"
};

const weekNumber = {
  fontSize: 24,
  fontWeight: 800
};

const weekDate = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  marginTop: 4
};

const actionRow = {
  display: "flex",
  gap: 10
};

const greenBtn = {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  background: "#22c55e",
  color: "#fff",
  border: "none"
};

const redBtn = {
  flex: 1,
  padding: 12,
  borderRadius: 12,
  background: "#f87171",
  color: "#fff",
  border: "none"
};

const timeGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2,1fr)",
  gap: 14
};

const timeTile = {
  padding: 28,
  borderRadius: 18,
  textAlign: "center",
  fontWeight: 800,
  background: "#ffffff",
  border: "2px solid #e2e8f0",
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
  cursor: "pointer"
};

const greenTile = {
  background: "#bbf7d0",
  color: "#166534",
  border: "2px solid #86efac"
};

const redTile = {
  background: "#fecaca",
  color: "#7f1d1d",
  border: "2px solid #fca5a5"
};
