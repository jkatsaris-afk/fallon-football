import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function TeamSchedulesPage({ setPage }) {
  const [games, setGames] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("schedule_master")
      .select("*");

    if (!data) return;
    setGames(data);
  };

  // Build team list
  const teamList = [...new Set(
    games.map(g => `${g.division} ${g.team}`)
  )].sort();

  // ✅ GOOGLE DRIVE LINKS
  const teamSchedules = {
    "2nd - 3rd Chiefs": "https://drive.google.com/file/d/1cZ0n8oGAgS2IamolguPbFeuXe35_CUwO/preview",

    "2nd - 3rd Rams": "https://drive.google.com/file/d/1KHz_qfNlrr7c0tLsO4HoAYvFUMpb9fv3/preview",
    "2nd - 3rd Raiders": "https://drive.google.com/file/d/1TdKVCMqNW-I7Ovq6LDHerSfSKLR5V6kz/preview",
    "2nd - 3rd Ravens": "https://drive.google.com/file/d/1cm85cfMwYDWbxkOi1u1JuN2RhznyNFrm/preview",
    "2nd - 3rd Bengals": "https://drive.google.com/file/d/19nUyuD_bf4stMyuJOUhtI7y4UE7A60U6/preview",
    "2nd - 3rd Bills": "https://drive.google.com/file/d/1Bpd7p9aGBnVY-AJCzYdQZmzl648HQ8hp/preview",
    "2nd - 3rd Colts": "https://drive.google.com/file/d/1qH_BT8wqry5L-xlEPO9y0LwYAPzoq0rl/preview",
    "2nd - 3rd Eagles": "https://drive.google.com/file/d/1CQHGqwhmYM4I9JkDa06gSPWNWrmVNLCa/preview",
    "2nd - 3rd Jets": "https://drive.google.com/file/d/1YzL8wsSZlqTH9HHK2gXoiVfGvzkt1u-n/preview",
    "2nd - 3rd Lions": "https://drive.google.com/file/d/18s2BuNTZLANLrLD5VWgV14k5K3q0_yNS/preview",
    "2nd - 3rd Steelers": "https://drive.google.com/file/d/1Ni_4WMu6N2KL0L7RQlE9zBpv3AngUAwg/preview",
    "2nd - 3rd 49ers": "https://drive.google.com/file/d/1Eh_13MOHe93qKUWIhalQ3fCz-gdq63ip/preview",

    "4th - 5th Chiefs": "https://drive.google.com/file/d/1yDhLyOZ1C1ikf7GURtEnoh5NH4WFFWDP/preview",
    "4th - 5th Rams": "https://drive.google.com/file/d/1Hhuk_UN2KPGFrklakRUqbfj9GCnn5RAC/preview",
    "4th - 5th Raiders": "https://drive.google.com/file/d/1d3XGWNk6nbdYddV4vD0JLHGC8diypHoU/preview",
    "4th - 5th Ravens": "https://drive.google.com/file/d/1Osh2b5Zi4_rLlwMzhq5UuO4yyKeP8vH_/preview",
    "4th - 5th Bengals": "https://drive.google.com/file/d/17cFsuht2G5buZ-9GACepisG23a-7iMrd/preview",
    "4th - 5th Bills": "https://drive.google.com/file/d/1ncPrhIygu3h94Azs80Q1FNTbeIyr3AlR/preview",
  };

  return (
    <div>

      {/* HEADER */}
      <div className="card active-card">
        <div className="title">Full Team Schedules</div>
      </div>

      {/* BACK */}
      <div className="card" onClick={() => setPage("schedule")}>
        <div className="sub">← Back to Schedule</div>
      </div>

      {/* TEAM LIST */}
      {!selectedTeam && (
        <div>
          {teamList.map((team, i) => (
            <div key={i} className="card" onClick={() => setSelectedTeam(team)}>
              <div className="title">{team}</div>
            </div>
          ))}
        </div>
      )}

      {/* PDF VIEW */}
      {selectedTeam && (
        <div>

          <div className="card active-card">
            <div className="title">{selectedTeam}</div>
          </div>

          <div className="card" onClick={() => setSelectedTeam(null)}>
            <div className="sub">← Back to Teams</div>
          </div>

          <div className="card">
            {teamSchedules[selectedTeam] ? (
              <iframe
                src={teamSchedules[selectedTeam]}
                width="100%"
                height="650px"
                title="Team Schedule"
              />
            ) : (
              <div className="sub">
                Schedule not uploaded yet
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
