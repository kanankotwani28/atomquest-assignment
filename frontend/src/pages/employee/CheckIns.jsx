import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyCheckIns } from "../../api/checkins";
import AppShell from "../../components/AppShell";
import GoalCheckInCard from "../../components/GoalCheckInCard";
import { Toaster } from "react-hot-toast";

export default function EmployeeCheckIns() {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState([]);
  const [currentQuarter, setCurrentQuarter] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [allowCheckinOutsideWindow, setAllowCheckinOutsideWindow] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await getMyCheckIns();
      setGoals(res.data.goals);
      setCurrentQuarter(res.data.currentQuarter);
      setAllowCheckinOutsideWindow(res.data.allowCheckinOutsideWindow || false);
      setCycle(res.data.cycle);
    } catch {
      // Empty state below covers unavailable check-ins.
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

  const subtitle = `${allowCheckinOutsideWindow ? "Dev mode: check-ins allowed outside windows" : currentQuarter ? `${currentQuarter} window is open` : "No active check-in window"}${cycle ? ` · ${cycle.year}` : ""}`;

  return (
    <AppShell user={user} logout={logout} title="Quarterly Check-ins" subtitle={subtitle}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-6">
        {!currentQuarter && !allowCheckinOutsideWindow && (
          <div className="aq-card border-[#8a6a2a] px-5 py-4">
            <p className="text-sm text-[#c09a4a]">Check-in window is currently closed.</p>
            <p className="mt-1 text-xs text-[#888]">
              Q1 opens in July · Q2 in October · Q3 in January · Q4 / Annual in March-April
            </p>
          </div>
        )}

        {goals.length === 0 ? (
          <div className="aq-card py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-[#2a2a2a]" />
            <h3 className="mb-2 font-medium text-[#888]">No approved goals yet</h3>
            <p className="text-sm text-[#555]">
              Check-ins are available once your manager approves your goals.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {goals.map((goal) => (
              <GoalCheckInCard
                key={goal.id}
                goal={goal}
                currentQuarter={currentQuarter}
                allowCheckinOutsideWindow={allowCheckinOutsideWindow}
                onSaved={fetchData}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
