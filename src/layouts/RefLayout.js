import { useState } from "react";

import RefLayout from "./RefLayout";

import RefDashboard from "../pages/Ref/RefDashboard";
import RefSchedulePage from "../pages/Ref/RefSchedulePage";
import RefTimePage from "../pages/Ref/RefTimePage";
import RefAvailabilityPage from "../pages/Ref/RefAvailabilityPage";
import RefProfilePage from "../pages/Ref/RefProfilePage";

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
