import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabase";

export default function AutoAssignPage() {
  const [games, setGames] = useState([]);
  const [refs, setRefs] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [week, setWeek] = useState(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: g } = await supabase.from("schedule_master_auto").select("*");
    const { data: r } = await supabase.from("referees").select("*");
    const { data: a } = await supabase.from("ref_availability").select("*");

    setGames(g || []);
    setRefs(r || []);
    setAvailability(a || []);
  };

  const weeks = [...new Set(games.map(g => g.week))].sort((a,b)=>a-b);

  const getTimeBlock = (game) => game.time;

  const isAvailable = (refId, w, t) => {
    const rec = availability.find(
      a => a.referee_id === refId && a.week === w && a.time_block === t
    );
    return rec ? rec.available : true;
  };

  const runAutoAssign = async () => {
    const targetGames = games.filter(g => g.week === week);

    const inserts = [];

    for (const game of targetGames) {
      for (const role of ["Ref 1","Ref 2"]) {
        const ref = refs.find(r =>
          isAvailable(r.id, game.week, getTimeBlock(game))
        );

        if (!ref) continue;

        inserts.push({
          game_id: game.id,
          referee_id: ref.id,
          role
        });
      }
    }

    if (inserts.length) {
      await supabase.from("ref_assignments").insert(inserts);
    }

    alert("Auto Assign Complete");
  };

  return (
    <div style={{ padding: 20 }}>

      <h2>Auto Assign Workflow</h2>

      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <h3>Select Week</h3>

          {weeks.map(w => (
            <button key={w} onClick={() => setWeek(w)}>
              Week {w}
            </button>
          ))}

          <button onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <h3>Review Availability</h3>

          {refs.map(r => (
            <div key={r.id}>
              {r.first_name} {r.last_name}
            </div>
          ))}

          <button onClick={() => setStep(3)}>Next</button>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <h3>Run Auto Assign</h3>

          <button onClick={runAutoAssign}>
            Run Auto Assign
          </button>
        </div>
      )}

    </div>
  );
}
