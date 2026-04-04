export default function DeviceToggle({ deviceMode, setDeviceMode }) {
  return (
    <div className="device-toggle">

      {["phone", "ipad", "desktop"].map(mode => (
        <button
          key={mode}
          className={`device-btn ${deviceMode === mode ? "active" : ""}`}
          onClick={() => setDeviceMode(mode)}
        >
          {mode.toUpperCase()}
        </button>
      ))}

    </div>
  );
}
