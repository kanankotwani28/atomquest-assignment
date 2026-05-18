import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTeamCheckIns } from "../../api/checkins";
import AppShell from "../../components/AppShell";
import ManagerCheckInRow from "../../components/ManagerCheckInRow";
import { Toaster } from "react-hot-toast";
import { ChevronDown, ChevronUp } from "lucide-react";

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "E";
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
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-base)" }}>
      <div className="skeleton h-4 w-44 rounded" />
    </div>
  );

  return (
    <AppShell user={user} logout={logout} title="Team Check-ins"
      subtitle={`${currentQuarter ? `${currentQuarter} window` : "No active window"}${cycle ? ` · ${cycle.year}` : ""}`}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-4">
        {team.length === 0 ? (
          <div className="aq-card py-20 text-center" style={{ background: "var(--surface-elevated)", borderStyle: "dashed" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No team members found.</p>
          </div>
        ) : team.map(({ employee, goals, overallScore }) => {
          const isExpanded = expanded[employee.id];
          return (
            <div key={employee.id} className="aq-card p-0 overflow-hidden rounded-2xl">
              <button type="button" className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                onClick={() => setExpanded((e) => ({ ...e, [employee.id]: !e[employee.id] }))}>
                <div className="flex items-center gap-3.5">
                  <div className="avatar text-[10px]">{initials(employee.name)}</div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{employee.name}</p>
                    <p className="micro">{employee.department || "General"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <ProgressArc value={overallScore || 0} />
                  <div className="text-right hidden sm:block">
                    <p className="label mb-0.5">Overall Score</p>
                    <p className="number-small" style={{ color: "var(--text-primary)" }}>{Number(overallScore || 0).toFixed(0)}%</p>
                  </div>
                  <span style={{ color: "var(--text-muted)" }}>
                    {isExpanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-white/[0.04] p-5 space-y-3" style={{ background: "var(--surface-base)" }}>
                  {goals.length === 0
                    ? <p className="text-center text-xs py-6" style={{ color: "var(--text-muted)" }}>No approved goals this cycle</p>
                    : goals.map((goal) => <ManagerCheckInRow key={goal.id} goal={goal} onUpdated={fetchData} />)
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function ProgressArc({ value }) {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const getColor = (s) => s >= 80 ? "#10B981" : s >= 60 ? "#818CF8" : s >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <svg viewBox="0 0 44 44" className="h-9 w-9 -rotate-90 flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={getColor(pct)} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 500ms ease" }} />
    </svg>
  );
}