import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyGoals,
  getThrustAreas,
  getActiveCycle,
  createGoal,
  updateGoal,
  deleteGoal,
  submitAllGoals,
} from "../../api/goals";
import AppShell from "../../components/AppShell";
import GoalCard from "../../components/GoalCard";
import GoalFormModal from "../../components/GoalFormModal";
import WeightageBar from "../../components/WeightageBar";
import toast, { Toaster } from "react-hot-toast";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [goals, setGoals] = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      const res = await getMyGoals();
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    Promise.all([
      getThrustAreas().then((r) => setThrustAreas(r.data)).catch(() => {}),
      getActiveCycle().then((r) => setCycle(r.data)).catch(() => {}),
    ]);
  }, []);

  const totalWeightage = goals.reduce((s, g) => s + g.weightage, 0);
  const remainingWeightage = Math.max(0, 100 - totalWeightage);
  const approvedCount = goals.filter((g) => g.status === "APPROVED").length;
  const submittedCount = goals.filter((g) => g.status === "SUBMITTED").length;
  const openCount = goals.length - approvedCount - submittedCount;

  const hasEditableGoals = goals.some((g) => ["DRAFT", "RETURNED", "REVISION_REQUIRED"].includes(g.status));
  const allApproved = goals.length > 0 && goals.every((g) => g.status === "APPROVED");
  const canSubmit =
    goals.some((g) => ["DRAFT", "RETURNED", "REVISION_REQUIRED"].includes(g.status)) &&
    Math.round(totalWeightage) === 100;

  const handleSave = async (data) => {
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, data);
        toast.success("Goal updated");
      } else {
        await createGoal(data);
        toast.success("Goal added");
      }
      setEditingGoal(null);
      await fetchGoals();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error || "Failed to save goal";
      toast.error(errorMsg);
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this goal?")) return;
    try {
      await deleteGoal(id);
      toast.success("Goal deleted");
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete goal");
    }
  };

  const handleSubmitAll = async () => {
    if (!confirm("Submit all goals for manager approval? You cannot edit them after submission.")) return;
    try {
      const res = await submitAllGoals();
      toast.success(res.data.message);
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Submission failed");
    }
  };

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
      title="My Goals"
      subtitle={cycle ? `${cycle.year} · ${cycle.phase}` : "Active Cycle"}
    >
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="aq-card stat-card">
            <span className="label">Goals Created</span>
            <span className="number-large mt-3">{goals.length}</span>
          </div>
          <div className="aq-card stat-card flex flex-row items-center justify-between">
            <div>
              <span className="label">Total Weightage</span>
              <span className="number-large mt-3 block">{totalWeightage.toFixed(1)}%</span>
            </div>
            <WeightRing value={totalWeightage} />
          </div>
          <div className="aq-card stat-card">
            <span className="label">Goals Status</span>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="status-badge status-submitted">{submittedCount} submitted</span>
              <span className="status-badge status-approved">{approvedCount} approved</span>
              <span className="status-badge status-draft">{openCount} open</span>
            </div>
          </div>
        </section>

        <WeightageBar goals={goals} />

        {allApproved && (
          <div className="notice-bar green">
            All goals approved by your manager
          </div>
        )}

        {goals.some((g) => g.status === "REVISION_REQUIRED") && (
          <div className="notice-bar amber">
            Revision required after shared KPI assignment. Rebalance weightages so the sheet totals 100%, then submit for manager re-approval.
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="label text-[#909090]">
            {goals.length} goal{goals.length !== 1 ? "s" : ""} · {cycle?.year}
          </h2>
          <div className="flex gap-3">
            {hasEditableGoals && goals.length < 8 && (
              <button
                onClick={() => {
                  setEditingGoal(null);
                  setModalOpen(true);
                }}
                className="btn"
              >
                Add Goal
              </button>
            )}
            {canSubmit && (
              <button onClick={handleSubmitAll} className="btn btn-confirm">
                Submit for Approval
              </button>
            )}
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="aq-card py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-[#222222] bg-[#0d0d0d] flex items-center justify-center text-[#555555]">
              !
            </div>
            <h3 className="mb-2 font-medium text-[#909090]">No goals yet</h3>
            <p className="mb-6 text-sm text-[#555555]">Start by adding your first goal for this cycle.</p>
            <button
              onClick={() => {
                setEditingGoal(null);
                setModalOpen(true);
              }}
              className="btn"
            >
              Add First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={(g) => {
                  setEditingGoal(g);
                  setModalOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {hasEditableGoals && Math.round(totalWeightage) !== 100 && goals.length > 0 && (
          <p className="text-center micro text-[#555555]">
            Total weightage must equal 100% before you can submit. Currently at {totalWeightage.toFixed(1)}%.
          </p>
        )}
      </div>

      <GoalFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSave}
        thrustAreas={thrustAreas}
        existingGoal={editingGoal}
        remainingWeightage={editingGoal ? remainingWeightage + editingGoal.weightage : remainingWeightage}
      />
    </AppShell>
  );
}

function WeightRing({ value }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative h-20 w-20 flex-shrink-0">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#222222" strokeWidth="4" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#e8e8e8"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="mono absolute inset-0 grid place-items-center text-xs text-[#f5f5f5]">{pct.toFixed(0)}%</div>
    </div>
  );
}
