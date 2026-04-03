import { useState } from "react";

export default function LoginModal({ onClose }) {
  const [selectedRole, setSelectedRole] = useState(null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >

        {/* TITLE */}
        <div className="title">Login</div>

        {/* ========================= */}
        {/* ROLE SELECT */}
        {/* ========================= */}
        {!selectedRole && (
          <>
            <div
              className="modal-option"
              onClick={() => setSelectedRole("Admin")}
            >
              Admin
            </div>

            <div
              className="modal-option"
              onClick={() => setSelectedRole("Coach")}
            >
              Coach
            </div>

            <div
              className="modal-option"
              onClick={() => setSelectedRole("Parent")}
            >
              Parent
            </div>
          </>
        )}

        {/* ========================= */}
        {/* COMING SOON SCREEN */}
        {/* ========================= */}
        {selectedRole && (
          <div
            style={{
              marginTop: 20,
              textAlign: "center"
            }}
          >
            <div className="title">{selectedRole}</div>

            <div
              className="sub"
              style={{
                marginTop: 10,
                fontSize: 16
              }}
            >
              Coming Soon
            </div>
          </div>
        )}

        {/* ========================= */}
        {/* CANCEL / BACK BUTTON */}
        {/* ========================= */}
        <div
          className="modal-cancel"
          onClick={() => {
            if (selectedRole) {
              setSelectedRole(null); // go back
            } else {
              onClose(); // close modal
            }
          }}
        >
          {selectedRole ? "← Back" : "Cancel"}
        </div>

      </div>
    </div>
  );
}
