import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTeamCheckIns } from "../../api/checkins";
import AppShell from "../../components/AppShell";
import ManagerCheckInRow from "../../components/ManagerCheckInRow";
import { Toaster } from "react-hot-toast";

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "E";
}

export default function ManagerCheckIns() {
  const { user, logout } = useAuth();
  const [team, setTeam] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const fetchData = async () => {
    try {
      const res = await getTeamCheckIns();
      setTeam(res.data.team);
      setCycle(res.data.cycle);
      setCurrentQuarter(res.data.currentQuarter);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="skeleton h-4 w-44 rounded" />
      </div>
    );
  }

  return (
    <AppShell
      user={user}
      logout={logout}
      title="Team Check-ins"
      subtitle={`${currentQuarter ? `${currentQuarter} window open` : "No active window"}${cycle ? ` · ${cycle.year}` : ""}`}
    >
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-4">
        {team.length === 0 ? (
          <div className="aq-card py-20 text-center text-[#555]">No team members found.</div>
        ) : (
          team.map(({ employee, goals, overallScore }) => (
            <div key={employee.id} className="aq-card overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center justify-between p-5 text-left hover:bg-[#161616]"
                onClick={() => setExpanded((e) => ({ ...e, [employee.id]: !e[employee.id] }))}
              >
                <div className="flex items-center gap-3">
                  <div className="avatar">{initials(employee.name)}</div>
                  <div>
                    <p className="text-sm font-medium text-[#f0f0f0]">{employee.name}</p>
                    <p className="text-xs text-[#555]">{employee.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <ProgressArc value={overallScore || 0} />
                  <div className="text-right">
                    <p className="text-xs text-[#555]">Overall score</p>
                    <p className="mono text-sm text-[#f0f0f0]">{Number(overallScore || 0).toFixed(1)}%</p>
                  </div>
                  <span className="text-xs text-[#555]">{expanded[employee.id] ? "Collapse" : "Expand"}</span>
                </div>
              </button>

              {expanded[employee.id] && (
                <div className="space-y-4 border-t border-[#2a2a2a] p-5">
                  {goals.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[#555]">No approved goals this cycle</p>
                  ) : (
                    goals.map((goal) => <ManagerCheckInRow key={goal.id} goal={goal} onUpdated={fetchData} />)
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

function ProgressArc({ value }) {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? "#4a7c59" : pct >= 50 ? "#8a6a2a" : "#7c3a3a";

  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}
