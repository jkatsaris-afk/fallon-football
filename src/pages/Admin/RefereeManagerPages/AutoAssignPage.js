
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabase";
import { useNavigate } from "react-router-dom";

export default function AutoAssignPage() {
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [refs, setRefs] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [week, setWeek] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: g } = await supabase.from("schedule_master_auto").select("*");
    const { data: r } = await supabase.from("referees").select("*");
    const { data: a } = await supabase.from("ref_availability").select("*");

    setGames(g || []);
    setRefs(r || []);
    setAvailability(a || []);
    setLoading(false);
  };

  const weeks = useMemo(() => {
    return [...new Set(games.map(g => g.week))].sort((a,b)=>a-b);
  }, [games]);

  const getTimeBlock = (game) => game.time;

  const isAvailable = (refId, w, t) => {
    const rec = availability.find(
      a => a.referee_id === refId && a.week === w && a.time_block === t
    );
    return rec ? rec.available : true;
  };

  const toggleAvailability = async (refId, w, t, val) => {
    const { data: existing } = await supabase
      .from("ref_availability")
      .select("*")
      .eq("referee_id", refId)
      .eq("week", w)
      .eq("time_block", t)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ref_availability")
        .update({ available: val })
        .eq("id", existing.id);
    } else {
      await supabase.from("ref_availability").insert({
        referee_id: refId,
        week: w,
        time_block: t,
        available: val,
      });
    }

    loadData();
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

    setSummary({
      games: targetGames.length,
      assignments: inserts.length
    });

    setStep(4);
  };

  if (loading) return <div style={wrap}>Loading...</div>;

  return (
    <div style={wrap}>

      {/* STEP TILES */}
      <div style={statsGrid}>
        <StepTile label="Step 1" title="Week" active={step===1} onClick={()=>setStep(1)} />
        <StepTile label="Step 2" title="Availability" active={step===2} onClick={()=>setStep(2)} />
        <StepTile label="Step 3" title="Assign" active={step===3} onClick={()=>setStep(3)} />
        <StepTile label="Step 4" title="Review" active={step===4} onClick={()=>setStep(4)} />
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div style={card}>
          <div style={title}>Select Week</div>

          <div style={weekGrid}>
            {weeks.map(w => (
              <button
                key={w}
                style={{...weekBtn, ...(week===w?activeWeekBtn:{})}}
                onClick={()=>setWeek(w)}
              >
                Week {w}
              </button>
            ))}
          </div>

          <button style={primaryBtn} onClick={()=>setStep(2)}>
            Next
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div style={card}>
          <div style={title}>Availability</div>

          {refs.map(r => (
            <div key={r.id} style={refRow}>
              <div style={refName}>
                {r.first_name} {r.last_name}
              </div>

              <div style={timeRow}>
                {["9:00","10:00","11:00","12:00"].map(t => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={isAvailable(r.id, week, t)}
                      onChange={(e)=>
                        toggleAvailability(r.id, week, t, e.target.checked)
                      }
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button style={primaryBtn} onClick={()=>setStep(3)}>
            Next
          </button>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div style={card}>
          <div style={title}>Run Auto Assign</div>

          <button style={runBtn} onClick={runAutoAssign}>
            Run Auto Assign
          </button>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && summary && (
        <div style={card}>
          <div style={title}>Summary</div>

          <div>Games: {summary.games}</div>
          <div>Assignments: {summary.assignments}</div>

          <button style={primaryBtn} onClick={() => navigate("/admin/referees")}>
            Back to Schedule
          </button>
        </div>
      )}

    </div>
  );
}

/* COMPONENTS */
function StepTile({ label, title, active, onClick }) {
  return (
    <button onClick={onClick} style={{...tile, ...(active?activeTile:{})}}>
      <div style={{fontSize:12}}>{label}</div>
      <div style={{fontWeight:700}}>{title}</div>
    </button>
  );
}

/* STYLES */
const wrap = { padding:20, display:"flex", flexDirection:"column", gap:20 };
const statsGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:12 };

const tile = { background:"#fff", padding:16, borderRadius:18 };
const activeTile = { outline:"2px solid #16a34a" };

const card = { background:"#fff", padding:20, borderRadius:18 };
const title = { fontWeight:800, marginBottom:10 };

const weekGrid = { display:"flex", gap:10, flexWrap:"wrap" };
const weekBtn = { padding:10, borderRadius:10 };
const activeWeekBtn = { outline:"2px solid #2563eb" };

const refRow = { marginBottom:12 };
const refName = { fontWeight:600 };
const timeRow = { display:"flex", gap:10 };

const primaryBtn = { marginTop:20, padding:10, background:"#16a34a", color:"#fff", border:"none", borderRadius:10 };
const runBtn = { padding:20, background:"#2563eb", color:"#fff", border:"none", borderRadius:12 };
