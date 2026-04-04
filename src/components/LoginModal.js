import { useState } from "react";
import { supabase } from "../supabase";

export default function LoginModal({ onClose }) {
  const [view, setView] = useState("select"); // select | admin | coach | parent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setError(error.message);
    } else {
      window.location.href = "/admin"; // temp routing
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-center"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ========================= */}
        {/* SELECT PORTAL */}
        {/* ========================= */}
        {view === "select" && (
          <>
            <div className="title">Select Portal</div>

            <div className="modal-option" onClick={() => setView("admin")}>
              Admin
            </div>

            <div className="modal-option" onClick={() => setView("coach")}>
              Coach
            </div>

            <div className="modal-option" onClick={() => setView("parent")}>
              Parent
            </div>
          </>
        )}

        {/* ========================= */}
        {/* LOGIN FORM */}
        {/* ========================= */}
        {view !== "select" && (
          <>
            <div className="title">
              {view === "admin"
                ? "Admin Login"
                : view === "coach"
                ? "Coach Login"
                : "Parent Login"}
            </div>

            <input
              className="input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div className="sub" style={{ color: "red" }}>
                {error}
              </div>
            )}

            <button className="button" onClick={handleLogin}>
              Login
            </button>
          </>
        )}

        {/* ========================= */}
        {/* BACK / CANCEL */}
        {/* ========================= */}
        <div
          className="modal-cancel"
          onClick={() => {
            if (view === "select") {
              onClose();
            } else {
              setView("select");
              setError("");
            }
          }}
        >
          {view === "select" ? "Cancel" : "← Back"}
        </div>

      </div>
    </div>
  );
}
