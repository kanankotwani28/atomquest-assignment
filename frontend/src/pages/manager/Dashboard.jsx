import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
import { getTeamGoals, approveGoals, returnGoal, pushTeamSharedGoal } from "../../api/manager";
import AppShell from "../../components/AppShell";
import EmployeeGoalCard from "../../components/EmployeeGoalCard";
import ReturnReasonModal from "../../components/ReturnReasonModal";
import toast, { Toaster } from "react-hot-toast";

const initialSharedGoal = {
  title: "",
  thrust_area_id: "",
  uom_type: "NUMERIC_MIN",
  target: "",
  weightage: "",
  employee_ids: [],
};

const UOM_OPTIONS = [
  { value: "NUMERIC_MIN", label: "Higher is better" },
  { value: "NUMERIC_MAX", label: "Lower is better" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero = Success" },
];

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const [team, setTeam] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [sharedGoal, setSharedGoal] = useState(initialSharedGoal);
  const [loading, setLoading] = useState(true);
  const [returningGoal, setReturningGoal] = useState(null);

  const fetchTeam = async () => {
    try {
      const res = await getTeamGoals();
      setTeam(res.data.team);
      setCycle(res.data.cycle);
    } catch {
      toast.error("Failed to load team goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    getThrustAreas().then((res) => setThrustAreas(res.data)).catch(() => {});
  }, []);

  const handleApprove = async (employeeId) => {
    const emp = team.find((t) => t.employee.id === employeeId);
    if (!confirm(`Approve all submitted goals for ${emp?.employee.name}? They will be locked.`)) return;
    try {
      const res = await approveGoals(employeeId);
      toast.success(res.data.message);
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.error || "Approval failed");
    }
  };

  const handleReturn = async (reason) => {
    try {
      await returnGoal(returningGoal.id, reason);
      toast.success("Goal returned for rework");
      fetchTeam();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to return goal");
    }
  };

  const toggleSharedGoalRecipient = (employeeId) => {
    setSharedGoal((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(employeeId)
        ? prev.employee_ids.filter((id) => id !== employeeId)
        : [...prev.employee_ids, employeeId],
    }));
  };

  const handlePushSharedGoal = async (e) => {
    e.preventDefault();
    try {
      const res = await pushTeamSharedGoal({
        ...sharedGoal,
        target: Number(sharedGoal.target),
        weightage: Number(sharedGoal.weightage),
      });
      toast.success(res.data.message);
      setSharedGoal(initialSharedGoal);
      fetchTeam();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail && detail.blocked) {
        const list = detail.blocked.map((b) => `${b.name} (${b.approved_total}% -> ${b.would_be}%)`).join(", ");
        toast.error(`${detail.message}: ${list}`);
      } else {
        toast.error(detail?.message || detail || "Failed to push KPI");
      }
    }
  };

  const totalPending = team.reduce((s, t) => s + t.submittedCount, 0);
  const totalApproved = team.reduce((s, t) => s + t.approvedCount, 0);
  const totalGoals = team.reduce((s, t) => s + t.goals.length, 0);
  const teamScore = totalGoals ? ((totalApproved / totalGoals) * 100).toFixed(1) : "0.0";

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
      title="Team Overview"
      subtitle={cycle ? `${cycle.year} · ${cycle.phase} · ${team.length} direct reports` : "Active Cycle"}
    >
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Stat label="Total Reports" value={team.length} />
          <Stat label="Pending Approvals" value={totalPending} tone="warning" />
          <Stat label="Approved" value={totalApproved} tone="success" />
          <div className="aq-card stat-card">
            <span className="label">Overall Team Score</span>
            <span className="number-large mt-3 block">{teamScore}%</span>
          </div>
        </section>

        {totalPending > 0 && (
          <div className="notice-bar amber">
            {totalPending} goal{totalPending !== 1 ? "s" : ""} awaiting review
          </div>
        )}

        <section className="aq-card p-5">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">Departmental KPI Push</h2>
            <p className="mt-1 text-xs text-[#555555]">Push an approved shared goal to selected direct reports.</p>
          </div>

          <form onSubmit={handlePushSharedGoal} className="space-y-3">
            <input
              value={sharedGoal.title}
              onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })}
              className="aq-input w-full"
              placeholder="KPI title"
              required
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <select value={sharedGoal.thrust_area_id} onChange={(e) => setSharedGoal({ ...sharedGoal, thrust_area_id: e.target.value })} className="aq-input w-full" required>
                <option value="">Thrust area</option>
                {thrustAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
              <select value={sharedGoal.uom_type} onChange={(e) => setSharedGoal({ ...sharedGoal, uom_type: e.target.value })} className="aq-input w-full">
                {UOM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <input type="number" step="any" value={sharedGoal.target} onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })} className="aq-input w-full" placeholder="Target" required />
              <input type="number" min="10" max="100" value={sharedGoal.weightage} onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })} className="aq-input w-full" placeholder="Weightage" required />
            </div>

            <div className="flex flex-wrap gap-2 py-1">
              {team.map(({ employee }) => (
                <label key={employee.id} className="flex items-center gap-2 rounded border border-[#222222] bg-[#111111] px-3 py-1.5 text-xs text-[#909090] cursor-pointer hover:border-[#2e2e2e] transition-colors">
                  <input type="checkbox" checked={sharedGoal.employee_ids.includes(employee.id)} onChange={() => toggleSharedGoalRecipient(employee.id)} />
                  {employee.name}
                </label>
              ))}
            </div>

            <button disabled={sharedGoal.employee_ids.length === 0} className="btn btn-confirm">
              Push KPI to {sharedGoal.employee_ids.length} employee(s)
            </button>
          </form>
        </section>

        {team.length === 0 ? (
          <div className="aq-card py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-[#222222] bg-[#0d0d0d] flex items-center justify-center text-[#555555]">
              !
            </div>
            <h3 className="mb-2 font-medium text-[#909090]">No direct reports found</h3>
            <p className="text-sm text-[#555555]">Ask your admin to set up the org hierarchy in the system.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {team.map(({ employee, goals, totalWeightage, submittedCount, approvedCount, revisionCount }) => (
              <EmployeeGoalCard
                key={employee.id}
                employee={employee}
                goals={goals}
                totalWeightage={totalWeightage}
                submittedCount={submittedCount}
                approvedCount={approvedCount}
                revisionCount={revisionCount}
                onApprove={handleApprove}
                onUpdated={fetchTeam}
                onReturn={(goal) => setReturningGoal(goal)}
              />
            ))}
          </div>
        )}
      </div>

      <ReturnReasonModal
        isOpen={!!returningGoal}
        goalTitle={returningGoal?.title}
        onConfirm={handleReturn}
        onClose={() => setReturningGoal(null)}
      />
    </AppShell>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === "success" ? "text-[#4d9966]" : tone === "warning" ? "text-[#c49a2a]" : "text-[#f5f5f5]";
  return (
    <div className="aq-card stat-card">
      <span className="label text-[#555555]">{label}</span>
      <span className={`number-large mt-3 block ${color}`}>{value}</span>
    </div>
  );
}
