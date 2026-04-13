export default function AdminLayout({ children }) {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f8fafc"
      }}
    >
      {children}
    </div>
  );
}
