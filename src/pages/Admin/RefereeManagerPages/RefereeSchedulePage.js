// 🔥 FULL FILE — SAFE TO COPY/PASTE

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
  const [teams, setTeams] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedRefs, setSelectedRefs] = useState({});
  const [filter, setFilter] = useState("all");
  const [weekFilter, setWeekFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const loadPageData = async () => {
    setLoading(true);
    setMessage("");

    const [gamesRes, refsRes, assignmentsRes, teamsRes] = await Promise.all([
      supabase.from("schedule_master_auto").select("*").ilike("event_type", "%game%"),
      supabase.from("referees").select("*").eq("status", "approved"),
      supabase.from("ref_assignments").select("*, referees(*)"),
      supabase.from("teams").select("id, name"),
    ]);

    setGames(gamesRes.data || []);
    setRefs(refsRes.data || []);
    setAssignments(assignmentsRes.data || []);
    setTeams(teamsRes.data || []);
    setLoading(false);
  };

  const assignmentsByGame = useMemo(() => {
    const map = {};
    assignments.forEach((a) => {
      if (!a.game_id) return; // ✅ FIX
      if (!map[a.game_id]) map[a.game_id] = [];
      map[a.game_id].push(a);
    });
    return map;
  }, [assignments]);

  const getAssignmentsForGame = (gameId) => assignmentsByGame[gameId] || [];

  const getRefName = (ref) =>
    `${ref?.first_name || ""} ${ref?.last_name || ""}`.trim();

  const getRefConflictReason = (ref, game, excludeId = null) => {
    const sameTime = assignments.some((a) => {
      if (a.referee_id !== ref.id) return false;
      if (excludeId && a.id === excludeId) return false;

      const g = games.find((x) => x.id === a.game_id); // ✅ FIX
      if (!g) return false;

      return g.event_date === game.event_date && g.time === game.time;
    });

    if (sameTime) return "Already assigned same time";
    return null;
  };

  const assignRefToSlot = async (game, slotIndex) => {
    const key = `${game.id}-${slotIndex}`;
    const refereeId = selectedRefs[key];
    if (!refereeId) return;

    const currentAssignments = getAssignmentsForGame(game.id);
    const currentAssignment = currentAssignments[slotIndex] || null;

    setSavingKey(key);

    let error;

    if (currentAssignment) {
      const res = await supabase
        .from("ref_assignments")
        .update({ referee_id: refereeId })
        .eq("id", currentAssignment.id);

      error = res.error;
    } else {
      const res = await supabase.from("ref_assignments").insert({
        game_id: game.id, // ✅ FIX
        referee_id: refereeId,
        role: slotIndex === 0 ? "Ref 1" : "Ref 2", // ✅ FIX
      });

      error = res.error;
    }

    if (error) {
      console.error(error);
      setMessage("Error saving assignment");
      setSavingKey(null);
      return;
    }

    await loadPageData();
    setSavingKey(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {games.map((game) => {
        const gameAssignments = getAssignmentsForGame(game.id);

        return (
          <div key={game.id}>
            <h3>
              {game.team} vs {game.opponent}
            </h3>

            {[0, 1].map((slotIndex) => {
              const assignment = gameAssignments[slotIndex];
              const assignedRef = assignment?.referees;

              const key = `${game.id}-${slotIndex}`;

              return (
                <div key={slotIndex}>
                  <div>
                    {assignedRef
                      ? getRefName(assignedRef)
                      : "No referee assigned"}
                  </div>

                  <select
                    value={selectedRefs[key] || ""}
                    onChange={(e) =>
                      setSelectedRefs((p) => ({
                        ...p,
                        [key]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select ref</option>
                    {refs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {getRefName(r)}
                      </option>
                    ))}
                  </select>

                  <button onClick={() => assignRefToSlot(game, slotIndex)}>
                    {savingKey === key ? "Saving..." : "Assign"}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
