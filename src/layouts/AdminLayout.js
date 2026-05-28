import { useEffect, useState } from "react";
import fallonLogo from "../resources/logo.png";
import {
  CalendarDays,
  ClipboardList,
  Flag,
  Home,
  Layers,
  MoreHorizontal,
  Radio,
  AlertTriangle,
  Settings,
  ShieldCheck,
  Trophy,
  UserRoundCog,
  Users,
} from "lucide-react";
import { supabase } from "../supabase";

const ADMIN_NAV_ITEMS = [
  { label: "Season Overview", page: "dashboard", icon: Home },
  { label: "Scoreboard", page: "scoreboard", icon: Radio },
  { label: "Board Members", page: "board", icon: UserRoundCog },
  { label: "Division Manager", page: "divisions", icon: Layers },
  { label: "Team Manager", page: "teams", icon: Users },
  { label: "Player Manager", page: "players", icon: Users },
  { label: "Matchup Manager", page: "matchups", icon: ClipboardList },
  { label: "Schedule Manager", page: "schedule", icon: CalendarDays },
  { label: "Score Manager", page: "games", icon: Flag },
  { label: "Championships", page: "championships", icon: Trophy },
  { label: "Field Manager", page: "fields", icon: Layers },
  { label: "Coach Manager", page: "coaches", icon: ShieldCheck },
  { label: "Complaints", page: "complaints", icon: AlertTriangle },
  { label: "Referee Manager", page: "referees", icon: ShieldCheck },
  { label: "Report Manager", page: "reports", icon: ClipboardList },
  { label: "Settings", page: "settings", icon: Settings },
];

export default function AdminLayout({
  adminPage,
  setAdminPage,
  children,
  setPage
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [settingsData, setSettingsData] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [seasonStatus, setSeasonStatus] = useState("");
  const primaryMobilePages = ["dashboard", "divisions", "teams", "championships"];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 800);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    loadSeasonSettings();
  }, []);

  const loadSeasonSettings = async () => {
    const [{ data: appSettings }, { data: seasonData }] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("seasons").select("*").order("year", { ascending: false }),
    ]);

    setSettingsData(appSettings || null);
    setSeasons(seasonData || []);
  };

  const updateCurrentSeason = async (seasonId) => {
    const season = seasons.find((item) => item.id === seasonId);
    if (!season) return;

    setSeasonStatus("");
    const payload = { current_season: Number(season.year || settingsData?.current_season || 0) };
    if ("current_season_uuid" in (settingsData || {})) {
      payload.current_season_uuid = season.id;
    }

    const { error } = await supabase.from("app_settings").update(payload).eq("id", 1);
    if (error) {
      console.error(error);
      setSeasonStatus("Season could not be updated.");
      return;
    }

    setSettingsData((current) => ({ ...(current || {}), ...payload }));
    setSeasonStatus("Season updated.");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setPage("home");
  };

  return (
    <div style={container}>
      {!isMobile && (
        <aside style={sidebar}>
          <div style={brandBlock}>
            <img src={fallonLogo} alt="Fallon Football" style={brandLogo} />
            <div style={topBarTitle}>
              <span style={brandTitle}>Fallon Football</span>
              <span style={brandSub}>Admin Portal</span>
            </div>
          </div>

          <div style={navShell}>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavBtn
                key={item.page}
                item={item}
                active={adminPage === item.page}
                onClick={() => setAdminPage(item.page)}
              />
            ))}
          </div>

          <SeasonSwitcher
            settings={settingsData}
            seasons={seasons}
            status={seasonStatus}
            onChange={updateCurrentSeason}
            onNewSeason={() => setAdminPage("settings")}
          />

          <button style={logoutBtn} onClick={logout}>Logout</button>
        </aside>
      )}

      <div style={main}>

        {isMobile && (
          <div style={mobileHeader}>
            <div style={brandBlock}>
              <img src={fallonLogo} alt="Fallon Football" style={brandLogo} />
              <div style={topBarTitle}>
                <span style={brandTitle}>Fallon Football Admin</span>
                <span style={brandSub}>Season control center</span>
              </div>
            </div>

            <button style={logoutBtn} onClick={logout}>Logout</button>
          </div>
        )}

        <div
          style={{ ...content, paddingBottom: isMobile ? "calc(112px + env(safe-area-inset-bottom))" : 80 }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>

        {isMobile && (
          <div className="nav-wrap admin-nav-wrap" style={{ zIndex: 1000 }}>
            <NavItem
              icon={<Home size={22} />}
              label="Season"
              active={adminPage === "dashboard"}
              onClick={() => setAdminPage("dashboard")}
            />
            <NavItem
              icon={<Layers size={22} />}
              label="Divisions"
              active={adminPage === "divisions"}
              onClick={() => setAdminPage("divisions")}
            />
            <NavItem
              icon={<Users size={22} />}
              label="Teams"
              active={adminPage === "teams"}
              onClick={() => setAdminPage("teams")}
            />
            <NavItem
              icon={<Trophy size={22} />}
              label="Champ"
              active={adminPage === "championships"}
              onClick={() => setAdminPage("championships")}
            />
            <NavItem
              icon={<MoreHorizontal size={22} />}
              label="More"
              active={adminPage === "more" || !primaryMobilePages.includes(adminPage)}
              onClick={() => setAdminPage("more")}
            />
          </div>
        )}

      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div
      className={`nav-item2 ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SeasonSwitcher({ settings, seasons, status, onChange, onNewSeason }) {
  const currentSeason = seasons.find((season) => (
    String(season.year) === String(settings?.current_season) ||
    season.id === settings?.current_season_uuid
  ));
  const seasonOptions = getUniqueSeasonOptions(seasons, currentSeason);

  return (
    <div style={seasonBox}>
      <div style={seasonLabel}>Current Season</div>
      <select
        value={currentSeason?.id || ""}
        onChange={(e) => onChange(e.target.value)}
        style={seasonSelect}
      >
        {!currentSeason && <option value="">{settings?.current_season || "Select season"}</option>}
        {seasonOptions.map((season) => (
          <option key={season.id} value={season.id}>
            {season.year || season.name}
          </option>
        ))}
      </select>
      <button style={newSeasonBtn} onClick={onNewSeason}>
        Start New Season
      </button>
      {status && <div style={seasonStatusText}>{status}</div>}
    </div>
  );
}

function getUniqueSeasonOptions(seasons, currentSeason) {
  const byYear = new Map();
  seasons.forEach((season) => {
    const key = String(season.year || season.name || season.id);
    if (!byYear.has(key) || season.id === currentSeason?.id) {
      byYear.set(key, season);
    }
  });
  return [...byYear.values()].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
}

/* DESKTOP BUTTON */
function NavBtn({ item, active, onClick }) {
  const Icon = item.icon || MoreHorizontal;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...navBtn,
        ...(active ? activeNavBtn : {}),
      }}
    >
      <Icon size={15} />
      <span>{item.label}</span>
    </button>
  );
}

/* STYLES */

const container = {
  display: "flex",
  minHeight: "100vh",
  background: "#f1f5f9"
};

const sidebar = {
  alignSelf: "stretch",
  background: "rgba(248,250,252,0.94)",
  borderRight: "1px solid #e2e8f0",
  display: "flex",
  flex: "0 0 280px",
  flexDirection: "column",
  gap: 14,
  maxHeight: "100vh",
  overflow: "hidden",
  padding: 16,
  position: "sticky",
  top: 0,
};

const main = {
  flex: 1,
  minWidth: 0,
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column"
};

const mobileHeader = {
  background: "rgba(248,250,252,0.94)",
  borderBottom: "1px solid #e2e8f0",
  padding: "14px 18px 12px",
  position: "sticky",
  top: 0,
  zIndex: 900,
  alignItems: "center",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
};

const brandBlock = {
  alignItems: "center",
  display: "flex",
  gap: 12,
  minWidth: 0
};

const brandLogo = {
  background: "#fff",
  borderRadius: 14,
  boxShadow: "0 10px 24px rgba(15,23,42,0.10)",
  height: 42,
  objectFit: "contain",
  padding: 6,
  width: 42,
};

const topBarTitle = {
  display: "grid",
  minWidth: 0
};

const brandTitle = {
  color: "#0f172a",
  fontSize: 17,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const brandSub = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const navShell = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 26,
  boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
  display: "flex",
  flex: 1,
  flexDirection: "column",
  gap: 6,
  marginTop: 12,
  overflowY: "auto",
  padding: 8,
  scrollbarWidth: "thin",
};

const seasonBox = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 20,
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  display: "grid",
  gap: 8,
  padding: 12,
};

const seasonLabel = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
};

const seasonSelect = {
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  color: "#0f172a",
  fontWeight: 800,
  padding: "10px 11px",
  width: "100%",
};

const newSeasonBtn = {
  background: "#0f172a",
  border: "none",
  borderRadius: 12,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
  padding: "10px 11px",
};

const seasonStatusText = {
  color: "#166534",
  fontSize: 11,
  fontWeight: 800,
};

const navBtn = {
  alignItems: "center",
  background: "transparent",
  border: "none",
  borderRadius: 999,
  color: "#475569",
  cursor: "pointer",
  display: "inline-flex",
  flex: "0 0 auto",
  fontSize: 13,
  fontWeight: 850,
  gap: 7,
  justifyContent: "flex-start",
  padding: "11px 13px",
  whiteSpace: "nowrap",
  width: "100%",
};

const activeNavBtn = {
  background: "#16a34a",
  boxShadow: "0 8px 20px rgba(22,163,74,0.22)",
  color: "#fff",
};

const content = {
  flex: 1,
  overflowY: "auto",
  padding: 20
};

const logoutBtn = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 800,
};
