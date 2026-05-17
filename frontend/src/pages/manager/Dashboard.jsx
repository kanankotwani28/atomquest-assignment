import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
import { getTeamGoals, approveGoals, returnGoal, pushTeamSharedGoal } from "../../api/manager";
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
  const [returningGoal, setReturningGoal] = useState(null); // goal being returned

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
    getThrustAreas()
      .then((res) => setThrustAreas(res.data))
      .catch(() => {});
  }, []);

  const handleApprove = async (employeeId) => {
    const emp = team.find((t) => t.employee.id === employeeId);
    if (
      !confirm(
        `Approve all submitted goals for ${emp?.employee.name}? They will be locked.`,
      )
    )
      return;
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
      toast.error(err.response?.data?.detail || "Failed to push KPI");
    }
  };

  // Summary counts for header stats
  const totalPending = team.reduce((s, t) => s + t.submittedCount, 0);
  const totalApproved = team.reduce((s, t) => s + t.approvedCount, 0);
  const totalGoals = team.reduce((s, t) => s + t.goals.length, 0);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading team goals...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Topbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Team Goals</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {cycle ? `${cycle.year} · ${cycle.phase}` : "Active cycle"} ·{" "}
              {team.length} direct reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.name}</span>
            <Link
              to="/manager/checkins"
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Check-ins →
            </Link>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-semibold text-gray-900">{totalGoals}</p>
            <p className="text-xs text-gray-500 mt-1">Total goals</p>
          </div>
          <div className="bg-white rounded-xl border border-yellow-200 p-4 text-center">
            <p className="text-2xl font-semibold text-yellow-600">
              {totalPending}
            </p>
            <p className="text-xs text-gray-500 mt-1">Pending approval</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-semibold text-green-600">
              {totalApproved}
            </p>
            <p className="text-xs text-gray-500 mt-1">Approved</p>
          </div>
        </div>

        {/* Pending approvals banner */}
        {totalPending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
            <p className="text-yellow-800 text-sm font-medium">
              {totalPending} goal{totalPending !== 1 ? "s" : ""} awaiting your
              review
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Departmental KPI Push</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Push an approved shared goal to selected direct reports.
              </p>
            </div>
          </div>

          <form onSubmit={handlePushSharedGoal} className="space-y-3">
            <input
              value={sharedGoal.title}
              onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="KPI title"
              required
            />
            <div className="grid grid-cols-4 gap-3">
              <select
                value={sharedGoal.thrust_area_id}
                onChange={(e) => setSharedGoal({ ...sharedGoal, thrust_area_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                required
              >
                <option value="">Thrust area</option>
                {thrustAreas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
              <select
                value={sharedGoal.uom_type}
                onChange={(e) => setSharedGoal({ ...sharedGoal, uom_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {UOM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                value={sharedGoal.target}
                onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Target"
                required
              />
              <input
                type="number"
                min="10"
                max="100"
                value={sharedGoal.weightage}
                onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Weightage"
                required
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {team.map(({ employee }) => (
                <label key={employee.id} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs">
                  <input
                    type="checkbox"
                    checked={sharedGoal.employee_ids.includes(employee.id)}
                    onChange={() => toggleSharedGoalRecipient(employee.id)}
                  />
                  {employee.name}
                </label>
              ))}
            </div>

            <button
              disabled={sharedGoal.employee_ids.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
            >
              Push KPI to {sharedGoal.employee_ids.length} employee(s)
            </button>
          </form>
        </div>

        {/* Team cards */}
        {team.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="font-medium text-gray-900 mb-2">
              No direct reports found
            </h3>
            <p className="text-sm text-gray-500">
              Ask your admin to set up the org hierarchy in the system.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {team.map(
              ({
                employee,
                goals,
                totalWeightage,
                submittedCount,
                approvedCount,
                revisionCount,
              }) => (
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
              ),
            )}
          </div>
        )}
      </main>

      <ReturnReasonModal
        isOpen={!!returningGoal}
        goalTitle={returningGoal?.title}
        onConfirm={handleReturn}
        onClose={() => setReturningGoal(null)}
      />
    </div>
  );
}
