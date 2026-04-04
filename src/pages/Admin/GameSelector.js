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

// ===== MAP (DB → FILE) =====
const teamLogos = {
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

// ===== SAFE LOOKUP =====
function getLogo(name) {
  if (!name) return null;
  return teamLogos[name.trim()] || null;
}

export default function GameSelector({ onGameStart }) {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    const { data, error } = await supabase
      .from("schedule_master")
      .select("*");

    if (error) {
      console.error("LOAD ERROR:", error);
      return;
    }

    const clean = data
      .map(g => ({
        ...g,
        clean_date: normalizeDate(g.event_date),
        clean_type: (g.event_type || "").toLowerCase().trim()
      }))
      .filter(g => g.clean_type.includes("game"));

    setGames(clean);
  }

  // ===== FIXED START GAME =====
  async function startGame(game) {
    console.log("🚀 START GAME FUNCTION", game);

    if (!game?.id) {
      console.error("❌ game.id missing");
      return;
    }

    // ===== CHECK EXISTING =====
    const { data: existing, error: checkError } = await supabase
      .from("games_live")
      .select("*")
      .eq("schedule_id", game.id)
      .maybeSingle();

    console.log("CHECK EXISTING:", existing, checkError);

    if (checkError) {
      console.error("❌ CHECK ERROR:", checkError);
      return;
    }

    if (existing) {
      console.log("⚡ GAME ALREADY EXISTS");
      return;
    }

    // ===== INSERT =====
    const { data, error } = await supabase
      .from("games_live")
      .insert([
        {
          schedule_id: game.id,
          home_score: 0,
          away_score: 0,
          half: 1,
          clock: "24:00",
          status: "live",
        },
      ])
      .select();

    console.log("🔥 INSERT RESULT:", data);
    console.log("🔥 INSERT ERROR:", error);

    if (error) {
      console.error("❌ INSERT FAILED:", error);
      return;
    }

    if (!data || data.length === 0) {
      console.error("❌ NO ROW RETURNED (RLS ISSUE)");
      return;
    }

    console.log("✅ GAME CREATED:", data[0]);

    if (onGameStart) {
      onGameStart(data[0], game);
    }
  }

  // ===== GROUP =====
  const grouped = games.reduce((acc, g) => {
    if (!g.clean_date) return acc;

    if (!acc[g.clean_date]) acc[g.clean_date] = {};
    if (!acc[g.clean_date][g.event_time]) acc[g.clean_date][g.event_time] = [];

    acc[g.clean_date][g.event_time].push(g);

    return acc;
  }, {});

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div style={container}>

      {/* ===== DATE ===== */}
      {!selectedDate &&
        dates.map(date => (
          <div
            key={date}
            className="card"
            onClick={() => setSelectedDate(date)}
          >
            <div className="title">{formatDate(date)}</div>
            <div className="sub">
              {Object.values(grouped[date]).flat().length} games
            </div>
          </div>
        ))}

      {/* ===== TIME ===== */}
      {selectedDate && !selectedTime && (
        <div>

          <div className="card active-card">
            <div className="title">{formatDate(selectedDate)}</div>
          </div>

          <div
            className="card"
            onClick={() => {
              setSelectedDate(null);
              setSelectedTime(null);
            }}
          >
            <div className="sub">← Back</div>
          </div>

          {Object.keys(grouped[selectedDate])
            .sort((a, b) => toTime(a) - toTime(b))
            .map(time => (
              <div
                key={time}
                className="card"
                style={{ background: "#e8f5e9" }}
                onClick={() => setSelectedTime(time)}
              >
                <div className="title">{time}</div>
              </div>
            ))}

        </div>
      )}

      {/* ===== GAMES ===== */}
      {selectedDate && selectedTime && (
        <div>

          <div className="card active-card">
            <div className="title">
              {formatDate(selectedDate)} - {selectedTime}
            </div>
          </div>

          <div
            className="card"
            onClick={() => setSelectedTime(null)}
          >
            <div className="sub">← Back</div>
          </div>

          {grouped[selectedDate][selectedTime].map((item, i) => (
            <div key={item.id}>

              {i !== 0 && <div className="divider" />}

              <div className="inner-tile">

                <div className="game-row">

                  {/* TEAM 1 */}
                  <div className="game-top">
                    <div className="team-row">
                      {getLogo(item.team) && (
                        <img src={getLogo(item.team)} style={logo} />
                      )}
                      <span>{item.team}</span>
                    </div>
                    <div className="game-time">{item.event_time}</div>
                  </div>

                  <div className="vs">vs</div>

                  {/* TEAM 2 */}
                  <div className="game-bottom">
                    <div className="team-row">
                      {getLogo(item.opponent) && (
                        <img src={getLogo(item.opponent)} style={logo} />
                      )}
                      <span>{item.opponent || "TBD"}</span>
                    </div>
                    <div className="field-badge">{item.field}</div>
                  </div>

                </div>

                {/* 🔥 BUTTON FIXED */}
                <button
                  style={startBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("✅ BUTTON CLICKED", item);
                    startGame(item);
                  }}
                >
                  Start Game
                </button>

              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}

/* ===== HELPERS ===== */

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes("-")) return dateStr;

  const [m, d, y] = dateStr.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric"
  });
}

function toTime(timeStr) {
  if (!timeStr) return 0;

  const [time, mod] = timeStr.split(" ");
  let [h, m] = time.split(":");

  if (mod === "PM" && h !== "12") h = +h + 12;
  if (mod === "AM" && h === "12") h = "00";

  return parseInt(h) * 60 + parseInt(m);
}

/* ===== STYLE ===== */

const container = {
  width: 300,
  padding: 10,
  overflowY: "auto",
  borderRight: "1px solid #e5e7eb"
};

const logo = {
  width: 22,
  height: 22,
  marginRight: 6
};

const startBtn = {
  marginTop: 8,
  width: "100%",
  padding: "6px",
  borderRadius: 6,
  border: "none",
  background: "#2f6ea6",
  color: "#fff",
  fontSize: 12,
  cursor: "pointer"
};
