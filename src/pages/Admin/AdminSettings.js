import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single();

    setSettings(data);
  };

  const update = async (field, value) => {
    await supabase
      .from("app_settings")
      .update({ [field]: value })
      .eq("id", 1);

    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ color: "#64748b", marginBottom: 20 }}>
        Manage league configuration
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20
        }}
      >

        {/* REGISTRATION */}
        <Tile title="Registration">

          <ToggleRow
            label="Player Signups Open"
            value={settings.signups_open}
            onChange={(val) => update("signups_open", val)}
          />

          <div style={{ height: 10 }} />

          <ToggleRow
            label="Coach Signups Open"
            value={settings.coach_signups_open}
            onChange={(val) => update("coach_signups_open", val)}
          />

          {/* ✅ ADDED */}
          <div style={{ height: 10 }} />

          <ToggleRow
            label="Ref Signups Open"
            value={settings.ref_signups_open}
            onChange={(val) => update("ref_signups_open", val)}
          />

        </Tile>

        {/* SEASON */}
        <Tile title="Season">
          <InputRow
            label="Current Season"
            value={settings.current_season}
            onChange={(val) => update("current_season", Number(val))}
          />
        </Tile>

        {/* FEES */}
        <Tile title="Fees">
          <InputRow
            label="Registration Fee ($)"
            value={settings.registration_fee}
            onChange={(val) => update("registration_fee", Number(val))}
          />
        </Tile>

      </div>
    </div>
  );
}

/* (unchanged UI helpers below) */
function Tile({ title, children }) { return <div style={{background:"#fff",borderRadius:16,padding:20,boxShadow:"0 6px 18px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",gap:15}}><div style={{fontWeight:600,fontSize:16}}>{title}</div>{children}</div>; }
function InputRow({ label, value, onChange }) { return <div><div style={{fontSize:13,color:"#64748b",marginBottom:6}}>{label}</div><input value={value} onChange={(e)=>onChange(e.target.value)} style={{width:"100%",padding:10,borderRadius:10,border:"1px solid #e2e8f0"}}/></div>; }
function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>{label}</div>
      <div onClick={()=>onChange(!value)} style={{width:50,height:26,borderRadius:20,background:value?"#2f6ea6":"#cbd5f5",position:"relative",cursor:"pointer"}}>
        <div style={{width:22,height:22,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:value?26:2}}/>
      </div>
    </div>
  );
}
