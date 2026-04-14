import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";

import Logo49ers from "../../../resources/San Francisco 49ers.png";
import LogoBengals from "../../../resources/Cincinnati Bengals.png";
import LogoBills from "../../../resources/Buffalo Bills.png";
import LogoBroncos from "../../../resources/Denver Broncos.png";
import LogoChiefs from "../../../resources/Kansas City Chiefs.png";
import LogoColts from "../../../resources/Indianapolis Colts.png";
import LogoEagles from "../../../resources/Philadelphia Eagles.png";
import LogoJets from "../../../resources/New York Jets.png";
import LogoLions from "../../../resources/Detroit Lions.png";
import LogoRaiders from "../../../resources/Las Vegas Raiders.png";
import LogoRams from "../../../resources/Los Angeles Rams.png";
import LogoSteelers from "../../../resources/Pittsburgh Steelers.png";

const TEAM_LOGOS = {
  "49ers": Logo49ers,
  Bengals: LogoBengals,
  Bills: LogoBills,
  Broncos: LogoBroncos,
  Chiefs: LogoChiefs,
  Colts: LogoColts,
  Eagles: LogoEagles,
  Jets: LogoJets,
  Lions: LogoLions,
  Raiders: LogoRaiders,
  Rams: LogoRams,
  Steelers: LogoSteelers,
};

export default function RefereeSchedulePage() {
  const [games, setGames] = useState([]);
  const [refs, setRefs] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedRefs, setSelectedRefs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setLoading(true);

    const [gamesRes, refsRes, assignmentsRes] = await Promise.all([
      supabase.from("schedule_master_auto").select("*"),
      supabase.from("referees").select("*").eq("status", "approved"),
      supabase.from("ref_assignments").select("*, referees(*)"),
    ]);

    setGames(gamesRes.data || []);
    setRefs(refsRes.data || []);
    setAssignments(assignmentsRes.data || []);
    setLoading(false);
  };

  const assignmentsByGame = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (!map[a.schedule_id]) map[a.schedule_id] = [];
      map[a.schedule_id].push(a);
    });
    return map;
  }, [assignments]);

  const getAssignmentsForGame = (id) => assignmentsByGame[id] || [];

  const getRefName = (ref) =>
    `${ref?.first_name || ""} ${ref?.last_name || ""}`.trim();

  const assignRef = async (game, slotIndex) => {
    const key = `${game.id}-${slotIndex}`;
    const refId = selectedRefs[key];
    if (!refId) return;

    await supabase.from("ref_assignments").insert({
      schedule_id: game.id,
      referee_id: refId,
      assigned_role: slotIndex === 0 ? "Ref 1" : "Ref 2",
    });

    loadPageData();
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Referee Schedule</h2>

      {games.map((game) => {
        const gameAssignments = getAssignmentsForGame(game.id);

        return (
          <div key={game.id} style={card}>
            <div style={matchup}>
              <span>{game.team}</span> vs <span>{game.opponent}</span>
            </div>

            <div style={grid}>
              {[0, 1].map((slotIndex) => {
                const assigned = gameAssignments[slotIndex]?.referees;

                return (
                  <div key={slotIndex} style={tile}>
                    <div style={label}>
                      {slotIndex === 0 ? "Referee 1" : "Referee 2"}
                    </div>

                    <div style={name}>
                      {assigned ? getRefName(assigned) : "Unassigned"}
                    </div>

                    {/* ✅ COACH TILE COMPLETELY REMOVED */}

                    <select
                      value={selectedRefs[`${game.id}-${slotIndex}`] || ""}
                      onChange={(e) =>
                        setSelectedRefs((prev) => ({
                          ...prev,
                          [`${game.id}-${slotIndex}`]: e.target.value,
                        }))
                      }
                      style={select}
                    >
                      <option value="">Select Ref</option>
                      {refs.map((r) => (
                        <option key={r.id} value={r.id}>
                          {getRefName(r)}
                        </option>
                      ))}
                    </select>

                    <button
                      style={btn}
                      onClick={() => assignRef(game, slotIndex)}
                    >
                      Assign
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===== styles (unchanged feel) ===== */

const card = {
  background: "#fff",
  padding: 16,
  borderRadius: 12,
  marginBottom: 16,
};

const matchup = {
  fontWeight: "bold",
  marginBottom: 10,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
};

const tile = {
  background: "#f8fafc",
  padding: 12,
  borderRadius: 10,
};

const label = {
  fontSize: 12,
  color: "#64748b",
};

const name = {
  fontWeight: "bold",
  marginBottom: 8,
};

const select = {
  width: "100%",
  marginBottom: 8,
};

const btn = {
  width: "100%",
  padding: 8,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
};
