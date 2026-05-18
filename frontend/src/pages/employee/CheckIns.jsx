import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyCheckIns } from "../../api/checkins";
import AppShell from "../../components/AppShell";
import GoalCheckInCard from "../../components/GoalCheckInCard";
import { SkeletonPage } from "../../components/Skeleton";
import { Toaster } from "react-hot-toast";
import { ClipboardCheck } from "lucide-react";

export default function EmployeeCheckIns() {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState([]);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [checkinWindowOpen, setCheckinWindowOpen] = useState(false);
  const [allowCheckinOutsideWindow, setAllowCheckinOutsideWindow] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await getMyCheckIns();
      setGoals(res.data.goals);
      setCurrentQuarter(res.data.currentQuarter);
      setCheckinWindowOpen(res.data.checkinWindowOpen || false);
      setAllowCheckinOutsideWindow(res.data.allowCheckinOutsideWindow || false);
    } catch { /* empty state below */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const init = async () => { await fetchData(); };
    init();
  }, []);

  if (loading) return <SkeletonPage cards={3} />;

  const subtitle = allowCheckinOutsideWindow
    ? "Dev mode — check-ins allowed outside window"
    : checkinWindowOpen && currentQuarter
    ? `${currentQuarter} window is open`
    : "Check-in window is controlled by admin";
  const showClosed = !allowCheckinOutsideWindow && !checkinWindowOpen;

  return (
    <AppShell user={user} logout={logout} title="Quarterly Check-ins" subtitle={subtitle}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {showClosed && (
          <div className="admin-notice admin-notice--amber">
            Check-in window is currently closed — contact your administrator to open one.
          </div>
        )}

        {goals.length === 0 ? (
          <div className="admin-glass" style={{ textAlign: "center", padding: "60px 24px", borderStyle: "dashed" }}>
            <div style={{ margin: "0 auto 14px", width: 44, height: 44, borderRadius: 14, background: "rgba(8,20,47,0.90)", border: "1px solid rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}>
              <ClipboardCheck size={20} strokeWidth={1.25} style={{ color: "#334155" }} />
            </div>
            <div className="admin-empty-title">No approved goals yet</div>
            <div className="admin-empty-text" style={{ marginTop: 6 }}>
              Check-ins are available once your manager approves your goals.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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