export default function LoginPage({ setRole, setShowLogin }) {
  return (
    <div style={{ padding: 20 }}>

      <h2>Login</h2>

      <div className="card">
        <div className="title">Choose Account Type</div>

        <button
          className="button"
          onClick={() => {
            setRole("admin");
            setShowLogin(false);
          }}
        >
          Admin
        </button>

        <button
          className="button"
          onClick={() => {
            setRole("coach");
            setShowLogin(false);
          }}
        >
          Coach
        </button>

        <button
          className="button"
          onClick={() => {
            setRole("parent");
            setShowLogin(false);
          }}
        >
          Parent
        </button>

        <button
          style={{ marginTop: 10 }}
          onClick={() => setShowLogin(false)}
        >
          Cancel
        </button>
      </div>

    </div>
  );
}
