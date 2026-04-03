export default function LoginModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>

        <div className="title">Login</div>

        <div className="modal-option">Admin</div>
        <div className="modal-option">Coach</div>
        <div className="modal-option">Parent</div>

        <div className="modal-cancel" onClick={onClose}>
          Cancel
        </div>

      </div>
    </div>
  );
}
