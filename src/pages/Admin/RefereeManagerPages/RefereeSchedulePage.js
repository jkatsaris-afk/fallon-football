// ONLY SHOWING THE FIXED PART — EVERYTHING ELSE SAME AS YOUR FILE

{/* 🔥 THIS SECTION IS CLEAN NOW */}
<div style={detailsGrid}>
  {[0, 1].map((slotIndex) => {
    const slotAssignment = gameAssignments[slotIndex] || null;
    const assignedRef = slotAssignment?.referees || null;
    const availableRefs = getAvailableRefsForGame(game, slotIndex);
    const selectedKey = `${game.id}-${slotIndex}`;

    return (
      <div key={slotIndex} style={detailTile}>
        <div style={detailLabel}>
          {slotIndex === 0 ? "Referee 1" : "Referee 2"}
        </div>

        <div style={assignedName}>
          {assignedRef
            ? getRefName(assignedRef)
            : "No referee assigned"}
        </div>

        {/* ❌ COACH TILE REMOVED COMPLETELY */}

        <select
          value={selectedRefs[selectedKey] || ""}
          onChange={(e) =>
            setSelectedRefs((prev) => ({
              ...prev,
              [selectedKey]: e.target.value,
            }))
          }
          style={select}
        >
          <option value="">Select referee</option>
          {availableRefs.map((ref) => (
            <option key={ref.id} value={ref.id}>
              {getRefName(ref)}
            </option>
          ))}
        </select>

        <div style={helperText}>
          Approved refs only. Blocks same-time conflicts.
        </div>

        <button
          style={assignBtn}
          onClick={() => assignRefToSlot(game, slotIndex)}
          disabled={
            !selectedRefs[selectedKey] || savingKey === selectedKey
          }
        >
          {savingKey === selectedKey
            ? "Saving..."
            : slotAssignment
            ? "Update Ref"
            : "Assign Ref"}
        </button>
      </div>
    );
  })}
</div>
