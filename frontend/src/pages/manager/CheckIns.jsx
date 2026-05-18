import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getTeamCheckIns } from "../../api/checkins";
import AppShell from "../../components/AppShell";
import ManagerCheckInRow from "../../components/ManagerCheckInRow";
import { SkeletonPage } from "../../components/Skeleton";

import { ChevronDown, ChevronUp, Users } from "lucide-react";

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

  if (loading) return <SkeletonPage title={false} cards={3} />;

  return (
    <AppShell
      user={user}
      logout={logout}
      title="Team Check-ins"
      subtitle={`${currentQuarter ? `${currentQuarter} window` : "No active window"}${cycle ? ` · ${cycle.year}` : ""}`}
    >


      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {team.length === 0 ? (
          <div className="admin-glass" style={{ textAlign: "center", padding: "60px 24px", borderStyle: "dashed" }}>
            <div style={{ margin: "0 auto 16px", width: 48, height: 48, borderRadius: 16, background: "rgba(8,20,47,0.90)", border: "1px solid rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}>
              <Users size={20} style={{ color: "#334155" }} />
            </div>
            <div className="admin-empty-title">No team members found</div>
            <div className="admin-empty-text" style={{ marginTop: 6 }}>Team check-ins will appear once members have approved goals</div>
          </div>
        ) : team.map(({ employee, goals, overallScore }) => {
          const isExpanded = expanded[employee.id];
          return (
            <div key={employee.id} className="admin-glass" style={{ padding: 0, overflow: "hidden" }}>
              <button type="button"
                style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", transition: "background 150ms ease" }}
                onClick={() => setExpanded((e) => ({ ...e, [employee.id]: !e[employee.id] }))}
                onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                    color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, display: "grid", placeItems: "center",
                    border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 0 10px rgba(99,102,241,0.15)"
                  }}>{initials(employee.name)}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{employee.name}</p>
                    <p style={{ fontSize: 11, color: "#475569" }}>{employee.department || "General"}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Overall Score</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{Number(overallScore || 0).toFixed(0)}%</span>
                  </div>
                  <ProgressArc value={overallScore || 0} />
                  <span style={{ color: "#334155" }}>
                    {isExpanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "16px 18px", background: "rgba(8,20,47,0.50)", display: "flex", flexDirection: "column", gap: 8 }}>
                  {goals.length === 0
                    ? <p style={{ textAlign: "center", fontSize: 11, color: "#475569", padding: "16px 0" }}>No approved goals this cycle</p>
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
    <svg viewBox="0 0 44 44" style={{ height: 36, width: 36, transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={getColor(pct)} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 500ms ease" }} />
    </svg>
  );
}