import { useState } from "react";

import RefLayout from "./RefLayout";

import RefDashboard from "./RefDashboard";
import RefSchedulePage from "./RefSchedulePage";
import RefTimePage from "./RefTimePage";
import RefAvailabilityPage from "./RefAvailabilityPage";
import RefProfilePage from "./RefProfilePage";

export default function RefPortal({ user }) {
  // ✅ KEEP HOME AS DEFAULT
  const [page, setPage] = useState("refDashboard");

  return (
    <RefLayout page={page} setPage={setPage}>

      {/* ✅ ONLY ONE PAGE RENDERS AT A TIME */}

      {page === "refDashboard" && (
        <RefDashboard user={user} />
      )}

      {page === "refSchedule" && (
        <RefSchedulePage user={user} />
      )}

      {page === "refTime" && (
        <RefTimePage user={user} />
      )}

      {page === "refAvailability" && (
        <RefAvailabilityPage user={user} />
      )}

      {page === "refProfile" && (
        <RefProfilePage user={user} />
      )}

    </RefLayout>
  );
}
