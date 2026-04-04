import { useState } from "react";
import ScoreboardManager from "./pages/admin/ScoreboardManager";
import DeviceToggle from "./components/DeviceToggle";

export default function App() {
  const [page, setPage] = useState("scoreboard");
  const [deviceMode, setDeviceMode] = useState("ipad");

  return (
    <div className="app">

      {/* DEVICE TOGGLE */}
      <DeviceToggle 
        deviceMode={deviceMode}
        setDeviceMode={setDeviceMode}
      />

      {/* PAGES */}
      {page === "scoreboard" && (
        <ScoreboardManager deviceMode={deviceMode} />
      )}

    </div>
  );
}
