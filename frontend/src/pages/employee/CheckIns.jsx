import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyCheckIns } from "../../api/checkins";
import AppShell from "../../components/AppShell";
import GoalCheckInCard from "../../components/GoalCheckInCard";
import { Toaster } from "react-hot-toast";
import { ClipboardCheck } from "lucide-react";

export default function EmployeeCheckIns() {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState([]);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [checkinWindowOpen, setCheckinWindowOpen] = useState(false);
  const [cycle, setCycle] = useState(null);
  const [allowCheckinOutsideWindow, setAllowCheckinOutsideWindow] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await getMyCheckIns();
      setGoals(res.data.goals);
      setCurrentQuarter(res.data.currentQuarter);
      setCheckinWindowOpen(res.data.checkinWindowOpen || false);
      setAllowCheckinOutsideWindow(res.data.allowCheckinOutsideWindow || false);
      setCycle(res.data.cycle);
    } catch { /* empty state below */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-base)" }}>
      <div className="skeleton h-4 w-44 rounded" />
    </div>
  );

  const subtitle = allowCheckinOutsideWindow
    ? "Dev mode — check-ins allowed outside window"
    : checkinWindowOpen && currentQuarter
    ? `${currentQuarter} window is open`
    : "Check-in window is controlled by admin";
  const showClosed = !allowCheckinOutsideWindow && !checkinWindowOpen;

  return (
    <AppShell user={user} logout={logout} title="Quarterly Check-ins" subtitle={subtitle}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-6">
        {showClosed && (
          <div className="notice-bar amber text-sm">
            Check-in window is currently closed — contact your administrator to open one.
          </div>
        )}

        {goals.length === 0 ? (
          <div className="aq-card py-20 text-center" style={{ background: "var(--surface-elevated)", borderStyle: "dashed" }}>
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-white/[0.06] flex items-center justify-center"
              style={{ background: "var(--surface-base)" }}>
              <ClipboardCheck size={22} strokeWidth={1.25} style={{ color: "var(--text-disabled)" }} />
            </div>
            <h3 className="mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              No approved goals yet
            </h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Check-ins are available once your manager approves your goals.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <GoalCheckInCard key={goal.id} goal={goal} currentQuarter={currentQuarter}
                allowCheckinOutsideWindow={allowCheckinOutsideWindow}
                checkinWindowOpen={checkinWindowOpen}
                onSaved={fetchData}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}