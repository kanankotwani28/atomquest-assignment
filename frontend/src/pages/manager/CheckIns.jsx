import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTeamCheckIns } from "../../api/checkins";
import AppShell from "../../components/AppShell";
import ManagerCheckInRow from "../../components/ManagerCheckInRow";
import { Toaster } from "react-hot-toast";
import { ChevronDown, ChevronUp } from "lucide-react";

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
          <div className="aq-card py-20 text-center text-[#555555]">No team members found.</div>
        ) : (
          team.map(({ employee, goals, overallScore }) => {
            const isExpanded = expanded[employee.id];
            return (
              <div key={employee.id} className="aq-card p-0 overflow-hidden">
                {/* Trigger Button */}
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#161616]"
                  onClick={() => setExpanded((e) => ({ ...e, [employee.id]: !e[employee.id] }))}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#222222] flex items-center justify-center text-xs font-semibold text-[#e8e8e8] flex-shrink-0">
                      {initials(employee.name)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#f5f5f5]">{employee.name}</p>
                      <p className="text-[11px] text-[#555555]">{employee.department || "General"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <ProgressArc value={overallScore || 0} />
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-[#555555] uppercase tracking-[0.06em]">Overall Score</p>
                      <p className="mono text-xs text-[#f5f5f5] font-semibold mt-0.5">{Number(overallScore || 0).toFixed(1)}%</p>
                    </div>
                    <span className="text-[#555555]">
                      {isExpanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
                    </span>
                  </div>
                </button>

                {/* Collapsible content */}
                {isExpanded && (
                  <div className="space-y-4 border-t border-[#222222] p-5 bg-[#0e0e0e]/40">
                    {goals.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[#555555]">No approved goals this cycle</p>
                    ) : (
                      goals.map((goal) => <ManagerCheckInRow key={goal.id} goal={goal} onUpdated={fetchData} />)
                    )}
                  </div>
                )}
              </div>
            );
          })
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

  const getColor = (score) => {
    if (score >= 80) return "#4d9966";
    if (score >= 60) return "#4a7ac4";
    if (score >= 40) return "#c49a2a";
    return "#c44a4a";
  };

  return (
    <svg viewBox="0 0 44 44" className="h-9 w-9 -rotate-90 flex-shrink-0">
      <circle cx="22" cy="22" r={radius} fill="none" stroke="#222222" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke={getColor(pct)}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}
