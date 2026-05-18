import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyGoals, getThrustAreas, getActiveCycle,
  createGoal, updateGoal, deleteGoal, submitAllGoals,
} from "../../api/goals";
import AppShell from "../../components/AppShell";
import GoalCard from "../../components/GoalCard";
import GoalFormModal from "../../components/GoalFormModal";
import WeightageBar from "../../components/WeightageBar";
import toast, { Toaster } from "react-hot-toast";
import { Target, Plus, Send, CheckCircle2, AlertTriangle } from "lucide-react";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [goals, setGoals]              = useState([]);
  const [thrustAreas, setThrustAreas]  = useState([]);
  const [cycle, setCycle]              = useState(null);
  const [modalOpen, setModalOpen]      = useState(false);
  const [editingGoal, setEditingGoal]  = useState(null);
  const [loading, setLoading]         = useState(true);

  const fetchGoals = async () => {
    try {
      const res = await getMyGoals();
      setGoals(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error("Failed to load goals"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchGoals();
    Promise.all([
      getThrustAreas().then((r) => setThrustAreas(r.data)).catch(() => {}),
      getActiveCycle().then((r) => setCycle(r.data)).catch(() => {}),
    ]);
  }, []);

  const totalWeightage     = goals.reduce((s, g) => s + g.weightage, 0);
  const remainingWeightage = Math.max(0, 100 - totalWeightage);
  const approvedCount      = goals.filter((g) => g.status === "APPROVED").length;
  const submittedCount     = goals.filter((g) => g.status === "SUBMITTED").length;
  const openCount         = goals.length - approvedCount - submittedCount;
  const allApproved       = goals.length > 0 && goals.every((g) => g.status === "APPROVED");
  const hasEditableGoals  = goals.length === 0 || goals.some((g) => ["DRAFT","RETURNED","REVISION_REQUIRED"].includes(g.status));
  const canSubmit         = goals.some((g) => ["DRAFT","RETURNED","REVISION_REQUIRED"].includes(g.status)) &&
                            Math.round(totalWeightage) === 100;

  const handleSave = async (data) => {
    try {
      if (editingGoal) { await updateGoal(editingGoal.id, data); toast.success("Goal updated"); }
      else             { await createGoal(data);                 toast.success("Goal added"); }
      setEditingGoal(null);
      await fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Failed to save goal");
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this goal?")) return;
    try { await deleteGoal(id); toast.success("Goal deleted"); fetchGoals(); }
    catch (err) { toast.error(err.response?.data?.detail || "Failed to delete goal"); }
  };

  const handleSubmitAll = async () => {
    if (!confirm("Submit all goals for manager approval? You cannot edit them after submission.")) return;
    try { const res = await submitAllGoals(); toast.success(res.data.message); fetchGoals(); }
    catch (err) { toast.error(err.response?.data?.detail || err.response?.data?.error || "Submission failed"); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-base)" }}>
      <div className="skeleton h-4 w-44 rounded" />
    </div>
  );

  return (
    <AppShell user={user} logout={logout} title="My Goals"
      subtitle={cycle ? `${cycle.year} · ${cycle.phase}` : "Active Cycle"}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-8">

        {/* ── Stats Row ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="aq-card p-5">
            <p className="label mb-3">Goals Created</p>
            <p className="number-large">{goals.length}</p>
            <p className="micro mt-1">of 8 maximum</p>
          </div>
          <div className="aq-card p-5">
            <p className="label mb-3">Total Weightage</p>
            <p className="number-large" style={{ color: Math.round(totalWeightage) === 100 ? "var(--score-excellent)" : totalWeightage > 100 ? "var(--score-poor)" : "var(--text-primary)" }}>
              {totalWeightage.toFixed(1)}%
            </p>
            <p className="micro mt-1">{remainingWeightage.toFixed(1)}% remaining</p>
          </div>
          <div className="aq-card p-5">
            <p className="label mb-3">Goals Status</p>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--status-submitted-text)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{submittedCount} submitted</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--score-excellent)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{approvedCount} approved</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--text-muted)" }} />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{openCount} open</span>
              </div>
            </div>
          </div>
          <div className="aq-card p-5">
            <p className="label mb-3">Progress</p>
            <p className="number-large" style={{ color: "var(--score-excellent)" }}>
              {goals.length ? `${((approvedCount / goals.length) * 100).toFixed(0)}%` : "0%"}
            </p>
            <p className="micro mt-1">{approvedCount} of {goals.length} goals approved</p>
          </div>
        </div>

        {/* ── Weightage Bar ────────────────────────────────────── */}
        <WeightageBar goals={goals} />

        {/* ── Status Alerts ───────────────────────────────────── */}
        {allApproved && (
          <div className="notice-bar green text-sm">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={14} strokeWidth={1.75} />
              All goals approved and locked by your manager
            </span>
          </div>
        )}
        {goals.some((g) => g.status === "REVISION_REQUIRED") && (
          <div className="notice-bar amber text-sm">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.75} />
              Revision required — a shared KPI was assigned. Rebalance to 100% and resubmit.
            </span>
          </div>
        )}

        {/* ── Action Bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {goals.length} goal{goals.length !== 1 ? "s" : ""} · {cycle?.year}
            </p>
            {hasEditableGoals && Math.round(totalWeightage) !== 100 && goals.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--status-submitted-text)" }}>
                {totalWeightage.toFixed(1)}% / 100% — balance to exactly 100% to submit
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {goals.length < 8 && !allApproved && (
              <button onClick={() => { setEditingGoal(null); setModalOpen(true); }}
                className="btn">
                <Plus size={13} /> Add Goal
              </button>
            )}
            {canSubmit && (
              <button onClick={handleSubmitAll} className="btn btn-confirm">
                <Send size={13} /> Submit for Approval
              </button>
            )}
          </div>
        </div>

        {/* ── Goals Grid ──────────────────────────────────────── */}
        {goals.length === 0 ? (
          <div className="aq-card py-20 text-center" style={{ background: "var(--surface-elevated)", borderStyle: "dashed" }}>
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-white/[0.06] flex items-center justify-center" style={{ background: "var(--surface-base)" }}>
              <Target size={22} strokeWidth={1.25} style={{ color: "var(--text-disabled)" }} />
            </div>
            <h3 className="mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No goals yet</h3>
            <p className="mb-6 text-xs" style={{ color: "var(--text-muted)" }}>Add your first goal to get started for this cycle</p>
            <button onClick={() => { setEditingGoal(null); setModalOpen(true); }} className="btn">
              <Plus size={13} /> Add First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal}
                onEdit={(g) => { setEditingGoal(g); setModalOpen(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>

      <GoalFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingGoal(null); }}
        onSave={handleSave}
        thrustAreas={thrustAreas}
        existingGoal={editingGoal}
        remainingWeightage={editingGoal ? remainingWeightage + editingGoal.weightage : remainingWeightage}
      />
    </AppShell>
  );
}