import React from "react";
import { supabase } from "../../../supabase";
import DefaultProfile from "../../../resources/Default-A.png";

export default function RefereeStaffPage({
  refs,
  loading,
  getName,
  getStatus,
  getRole,
  displayRole,
  updateStatus,
  updateRole,
}) {
  const getProfileImage = (ref) => {
    const raw =
      ref.profile_image ||
      ref.profile_image_url ||
      ref.photo_url ||
      "";

    if (!raw) return DefaultProfile;
    if (raw.startsWith("http")) return raw;

    return DefaultProfile;
  };

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={sectionCard}>
          <h2 style={heading}>Referee Staff</h2>
          <div style={muted}>Loading referees...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={sectionCard}>
        <div style={headerRow}>
          <div>
            <h2 style={heading}>Referee Staff</h2>
          </div>
        </div>

        <div style={listWrap}>
          {refs.map((ref) => {
            const role = getRole(ref);

            return (
              <div key={ref.id} style={refCard}>
                <div style={refTopRow}>
                  <div style={leftSide}>
                    <img
                      src={getProfileImage(ref)}
                      alt={getName(ref)}
                      style={profileImage}
                    />
                    <div style={nameBlock}>
                      <div style={refName}>{getName(ref)}</div>
                      <div style={contactRow}>{ref.email}</div>
                    </div>
                  </div>
                </div>

                <div style={detailsGrid}>

                  {/* ROLE TILE (CLEAN — NO COACH) */}
                  <div style={detailTile}>
                    <div style={detailLabel}>Role</div>

                    <select
                      value={role}
                      onChange={(e) =>
                        updateRole(ref, e.target.value)
                      }
                      style={select}
                    >
                      <option value="assistant">Assistant Ref</option>
                      <option value="head">Head Ref</option>
                    </select>

                    <div style={helperText}>
                      {displayRole(ref)}
                    </div>
                  </div>

                  {/* STATUS TILE (UNCHANGED) */}
                  <div style={detailTile}>
                    <div style={detailLabel}>Status</div>

                    <div style={buttonRow}>
                      <button
                        type="button"
                        style={approveBtn}
                        onClick={() => updateStatus(ref.id, "approved")}
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        style={pendingBtn}
                        onClick={() => updateStatus(ref.id, "pending")}
                      >
                        Pending
                      </button>

                      <button
                        type="button"
                        style={denyBtn}
                        onClick={() => updateStatus(ref.id, "denied")}
                      >
                        Deny
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
