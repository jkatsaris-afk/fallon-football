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

    load();
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>⚙️ League Settings</h2>

      <label>
        <input
          type="checkbox"
          checked={settings.signups_open}
          onChange={(e)=>update("signups_open", e.target.checked)}
        />
        Signups Open
      </label>

      <div>
        <label>Season</label>
        <input
          value={settings.current_season}
          onChange={(e)=>update("current_season", Number(e.target.value))}
        />
      </div>

      <div>
        <label>Registration Fee</label>
        <input
          value={settings.registration_fee}
          onChange={(e)=>update("registration_fee", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
