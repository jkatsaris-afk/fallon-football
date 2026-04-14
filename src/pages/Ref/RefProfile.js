/* 🔥 STYLES */

const wrap = {
  padding: 16, // 🔥 smaller for mobile
  display: "flex",
  flexDirection: "column",
  gap: 16,
  alignItems: "center" // 🔥 keeps centered nicely
};

const title = {
  fontSize: 22, // 🔥 slightly smaller for mobile
  fontWeight: 700
};

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 18,            // 🔥 smaller padding
  width: "100%",          // 🔥 full width
  maxWidth: 600,          // 🔥 balanced size
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
};

const imageWrap = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 8
};

const profileImg = {
  width: 110,             // 🔥 smaller for mobile
  height: 110,
  borderRadius: "50%",
  objectFit: "cover"
};

const uploadWrap = {
  textAlign: "center",
  marginBottom: 8
};

const name = {
  fontSize: 18,           // 🔥 slightly smaller
  fontWeight: 700,
  textAlign: "center",
  marginBottom: 8
};

const field = {
  marginTop: 12
};

const label = {
  fontSize: 11,           // 🔥 tighter
  color: "#64748b"
};

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  fontSize: 14
};

const textarea = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  minHeight: 70,
  fontSize: 14
};

const buttonRow = {
  marginTop: 16,
  display: "flex",
  gap: 8,
  justifyContent: "center",
  flexWrap: "wrap" // 🔥 prevents overflow
};

const btn = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  flex: "1 1 120px" // 🔥 responsive buttons
};

const cancelBtn = {
  background: "#64748b",
  color: "#fff",
  border: "none",
  padding: "10px 14px",
  borderRadius: 10,
  flex: "1 1 120px"
};

const uploadBtn = {
  background: "#16a34a",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 13
};

/* 🔥 SOFT RED LOGOUT */
const logoutBtn = {
  marginTop: 16,
  background: "rgba(220,38,38,0.12)",
  color: "#b91c1c",
  border: "1px solid rgba(220,38,38,0.25)",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  width: "100%"
};
