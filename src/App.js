import { useState } from "react";

// PUBLIC
import HomePage from "./pages/Public/HomePage";
import SchedulePage from "./pages/Public/SchedulePage";

// ADMIN (⚠️ THIS IS YOUR ISSUE LINE)
import ScoreboardManager from "./pages/Admin/ScoreboardManager";

// COMPONENTS
import DeviceToggle from "./components/DeviceToggle";

export default function App() {
  const [page, setPage] = useState("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deviceMode, setDeviceMode] = useState("ipad");

  return (
    <div className="app">

      {/* TEMP ADMIN BUTTON */}
      <div style={{ padding: 10 }}>
        <button onClick={() => setIsAdmin(!isAdmin)}>
          Toggle Admin ({isAdmin ? "ON" : "OFF"})
        </button>
      </div>

      {/* ADMIN TOGGLE */}
      {isAdmin && (
        <DeviceToggle
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
        />
      )}

      {/* PUBLIC */}
      {!isAdmin && (
        <>
          {page === "home" && <HomePage setPage={setPage} />}
          {page === "schedule" && <SchedulePage />}
        </>
      )}

      {/* ADMIN */}
      {isAdmin && (
        <ScoreboardManager deviceMode={deviceMode} />
      )}

    </div>
  );
}
