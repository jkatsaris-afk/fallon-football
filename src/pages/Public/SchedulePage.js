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
import ravens from "../../resources/Baltimore Ravens.png";

// ===== MAP =====
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
  "Ravens": ravens,
};

function getLogo(name) {
  if (!name) return null;
  return teamLogos[name.trim()] || null;
}

export default function SchedulePage({ setPage }) {
  const [games, setGames] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    if (!data) return;
    setGames(data);
  };

  const cleanGames = games.map(g => ({
    ...g,
    clean_date: normalizeDate(g.event_date),
    clean_type: (g.event_type || "").toLowerCase().trim()
  }));

  const grouped = cleanGames.reduce((acc, game) => {
    if (!game.clean_date) return acc;
    if (!acc[game.clean_date]) acc[game.clean_date] = [];
    acc[game.clean_date].push(game);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <div>

      {/* TOP LEVEL */}
      {!selectedDate && (
        <>
          {/* ✅ NEW TILE */}
          <div className="card" onClick={() => setPage("teamSchedules")}>
            <div className="title">Full Team Schedules</div>
            <div className="sub">View all team PDFs</div>
          </div>

          {/* EXISTING DATE TILES */}
          {dates.map(date => (
            <div
              key={date}
              className="card"
              onClick={() => setSelectedDate(date)}
            >
              <div className="title">{formatDate(date)}</div>
              <div className="sub">{grouped[date].length} events</div>
            </div>
          ))}
        </>
      )}

      {/* DATE SELECTED */}
      {selectedDate && !selectedType && (
        <div>

          <div className="card active-card">
            <div className="title">{formatDate(selectedDate)}</div>
          </div>

          <div
            className="card"
            onClick={() => {
              setSelectedDate(null);
              setSelectedType(null);
            }}
          >
            <div className="sub">← Back</div>
          </div>

          <div className="card" onClick={() => setSelectedType("game")}>
            <div className="title">Games</div>
          </div>

          <div className="card" onClick={() => setSelectedType("practice")}>
            <div className="title">Practices</div>
          </div>

        </div>
      )}

      {/* GAME / PRACTICE VIEW */}
      {selectedDate && selectedType && (
        <div>

          <div className="card active-card">
            <div className="title">
              {formatDate(selectedDate)} - {selectedType.toUpperCase()}
            </div>
          </div>

          <div
            className="card"
            onClick={() => setSelectedType(null)}
          >
            <div className="sub">← Back</div>
          </div>

          {grouped[selectedDate]
            .filter(g => g.clean_type.includes(selectedType))
            .sort((a, b) => toTime(a.event_time) - toTime(b.event_time))
            .map((item, i) => (
              <div key={item.id}>

                {i !== 0 && <div className="divider" />}

                <div className="inner-tile">

                  {selectedType === "game" ? (
                    <div className="game-row">

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

                      <div className="game-bottom">
                        <div className="team-row">
                          {getLogo(item.opponent) && (
                            <img src={getLogo(item.opponent)} style={logo} />
                          )}
                          <span>{item.opponent || "TBD"}</span>
                        </div>

                        <div className="field-badge">
                          {item.division} • {item.field}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="practice-row">

                      <div className="team">{item.team}</div>
                      <div className="game-time">{item.event_time}</div>

                      <div className="field-badge">
                        {item.division} • {item.field}
                      </div>

                    </div>
                  )}

                </div>

              </div>
            ))}

        </div>
      )}

    </div>
  );
}

/* HELPERS */

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

const logo = {
  width: 20,
  height: 20,
  marginRight: 6
};
