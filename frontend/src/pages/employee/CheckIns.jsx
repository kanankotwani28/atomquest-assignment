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

  const subtitle = allowCheckinOutsideWindow
    ? "Dev Mode: check-ins allowed outside window"
    : checkinWindowOpen && currentQuarter
    ? `${currentQuarter} window is open`
    : "Check-in window is controlled by admin";
  const showClosedNotice = !allowCheckinOutsideWindow && !checkinWindowOpen;

  return (
    <AppShell user={user} logout={logout} title="Quarterly Check-ins" subtitle={subtitle}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-6">
        {showClosedNotice && (
          <div className="notice-bar amber">
            Check-in window is currently closed. Contact your administrator to open a check-in window.
          </div>
        )}

        {goals.length === 0 ? (
          <div className="aq-card py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-[#222222] bg-[#0d0d0d] flex items-center justify-center text-[#555555]">
              !
            </div>
            <h3 className="mb-2 font-medium text-[#909090]">No approved goals yet</h3>
            <p className="text-sm text-[#555555]">
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
