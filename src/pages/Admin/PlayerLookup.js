import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function PlayerLookup() {
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    const { data } = await supabase
      .from("players")
      .select(`
        id,
        first_name,
        last_name,
        shirt_size,
        payment_status,
        divisions(name),
        teams(name),
        parent_name,
        parent_phone
      `);

    setPlayers(data || []);
  };

  const filtered = players.filter(p =>
    `${p.first_name} ${p.last_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Player Lookup</h2>

      {/* SEARCH */}
      <input
        placeholder="Search player..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchBox}
      />

      {/* RESULTS */}
      <div style={{ marginTop: 15 }}>
        {filtered.map(p => (
          <div key={p.id} style={card}>
            <div style={name}>
              {p.first_name} {p.last_name}
            </div>

            <div style={info}>Team: {p.teams?.name || "—"}</div>
            <div style={info}>Division: {p.divisions?.name || "—"}</div>
            <div style={info}>Shirt: {p.shirt_size || "—"}</div>
            <div style={info}>Payment: {p.payment_status || "—"}</div>
            <div style={info}>Parent: {p.parent_name || "—"}</div>
            <div style={info}>Phone: {p.parent_phone || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* STYLES */

const searchBox = {
  width: "100%",
  padding: 12,
  borderRadius: 10,
  border: "1px solid #ddd",
  fontSize: 14
};

const card = {
  background: "#fff",
  padding: 15,
  borderRadius: 12,
  marginBottom: 10,
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
};

const name = {
  fontWeight: 600,
  fontSize: 16,
  marginBottom: 6
};

const info = {
  fontSize: 13,
  color: "#555"
};
