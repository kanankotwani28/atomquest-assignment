import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getMyGoals, getThrustAreas, getActiveCycle,
  createGoal, updateGoal, deleteGoal, submitAllGoals,
} from "../../api/goals";
import useData from "../../hooks/useData";
import AppShell from "../../components/AppShell";
import GoalCard from "../../components/GoalCard";
import GoalFormModal from "../../components/GoalFormModal";
import WeightageBar from "../../components/WeightageBar";
import { SkeletonPage } from "../../components/Skeleton";
import ConfirmDialog from "../../components/ConfirmDialog";
import toast from "react-hot-toast";
import { Target, Plus, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import CycleCountdown from "../../components/CycleCountdown";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();

  // Premium SWR caching hooks
  const { data: cachedGoals, loading: loadingGoals, mutate: mutateGoals } = useData(getMyGoals, "my-goals", { initialData: [] });
  const { data: cachedThrustAreas } = useData(getThrustAreas, "thrust-areas", { initialData: [] });
  const { data: cachedCycle } = useData(getActiveCycle, "active-cycle", { initialData: null });

  const [goals, setGoals]              = useState([]);
  const [thrustAreas, setThrustAreas]  = useState([]);
  const [cycle, setCycle]              = useState(null);
  const [modalOpen, setModalOpen]      = useState(false);
  const [editingGoal, setEditingGoal]  = useState(null);
  const [confirm, setConfirm]           = useState(null);

  // Sync cache with local state for optimistic updates and smooth rendering
  useEffect(() => {
    if (cachedGoals) setGoals(cachedGoals);
  }, [cachedGoals]);

  useEffect(() => {
    if (cachedThrustAreas) setThrustAreas(cachedThrustAreas);
  }, [cachedThrustAreas]);

  useEffect(() => {
    if (cachedCycle) setCycle(cachedCycle);
  }, [cachedCycle]);

  const [searchParams] = useSearchParams();

  // Deep-linking: scroll to goal when goalId query param is present
  useEffect(() => {
    const goalId = searchParams.get("goalId");
    if (goalId && goals.length > 0) {
      const el = document.getElementById(`goal-${goalId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("animate-success");
        setTimeout(() => el.classList.remove("animate-success"), 1500);
      }
    }
  }, [goals, searchParams]);

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
    const snapshot = [...goals];
    if (editingGoal) {
      setGoals((prev) => prev.map((g) => g.id === editingGoal.id ? { ...g, ...data } : g));
    } else {
      setGoals((prev) => [...prev, { ...data, id: "__optimistic__", status: "DRAFT" }]);
    }
    try {
      editingGoal
        ? await updateGoal(editingGoal.id, data)
        : await createGoal(data);
      toast.success(editingGoal ? "Goal updated" : "Goal added");
      setEditingGoal(null);
      await mutateGoals();
    } catch (err) {
      setGoals(snapshot);
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Failed to save goal");
      throw err;
    }
  };

  const handleDelete = (id) => {
    const deletedGoal = goals.find((g) => g.id === id);
    if (!deletedGoal) return;

    // Optimistically remove from UI
    setGoals((prev) => prev.filter((g) => g.id !== id));

    // Schedule actual deletion after 10s
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await deleteGoal(id);
        await mutateGoals();
      } catch (err) {
        // Restore if API fails
        setGoals((prev) => [...prev, deletedGoal]);
        toast.error(err.response?.data?.detail || "Failed to delete goal");
      }
    }, 10000);

    // Show undo toast for 10 seconds
    toast(
      (t) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Goal deleted</span>
          <button
            onClick={() => {
              cancelled = true;
              clearTimeout(timer);
              setGoals((prev) => [...prev, deletedGoal]);
              toast.dismiss(t.id);
              toast.success("Goal restored");
            }}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "#818CF8",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Undo
          </button>
        </div>
      ),
      { duration: 10000, className: "toast-dark" }
    );
  };


  const handleSubmitAll = async () => {
    const snapshot = goals.map((g) => ({ ...g }));
    setGoals((prev) => prev.map((g) =>
      ["DRAFT", "RETURNED", "REVISION_REQUIRED"].includes(g.status) ? { ...g, status: "SUBMITTED" } : g
    ));
    try {
      const res = await submitAllGoals();
      toast.success(res.data.message);
    } catch (err) {
      setGoals(snapshot);
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Submission failed");
    } finally {
      await mutateGoals();
    }
  };

  if (loadingGoals) return <SkeletonPage cards={3} />;

  return (
    <AppShell user={user} logout={logout} title="My Goals" subtitle={cycle ? `${cycle.year} · ${cycle.phase}` : "Active Cycle"} actions={cycle && <CycleCountdown cycle={cycle} />}>


      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Stats Row ────────────────────────────────────────── */}
        <div className="admin-metrics">
          <div className="admin-metric-card">
            <span className="admin-metric-lbl">Goals Created</span>
            <span className="admin-metric-val">{goals.length}</span>
            <span className="admin-metric-sub">of 8 maximum</span>
          </div>
          <div className="admin-metric-card">
            <span className="admin-metric-lbl">Total Weightage</span>
            <span className="admin-metric-val" style={{
              color: Math.round(totalWeightage) === 100 ? "#10B981" : totalWeightage > 100 ? "#EF4444" : "#fff"
            }}>{totalWeightage.toFixed(1)}%</span>
            <span className="admin-metric-sub">{remainingWeightage.toFixed(1)}% remaining</span>
          </div>
          <div className="admin-metric-card">
            <span className="admin-metric-lbl">Goals Status</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{submittedCount} submitted</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{approvedCount} approved</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#64748B" }} />
                <span style={{ fontSize: 12, color: "#94A3B8" }}>{openCount} open</span>
              </div>
            </div>
          </div>
          <div className="admin-metric-card">
            <span className="admin-metric-lbl">Progress</span>
            <span className="admin-metric-val" style={{ color: "#10B981" }}>
              {goals.length ? `${((approvedCount / goals.length) * 100).toFixed(0)}%` : "0%"}
            </span>
            <span className="admin-metric-sub">{approvedCount} of {goals.length} goals approved</span>
          </div>
        </div>

        {/* ── Weightage Bar ────────────────────────────────────── */}
        <WeightageBar goals={goals} />

        {/* ── Status Alerts ───────────────────────────────────── */}
        {allApproved && (
          <div className="admin-notice admin-notice--green">
            <CheckCircle2 size={14} strokeWidth={1.75} />
            All goals approved and locked by your manager
          </div>
        )}
        {goals.some((g) => g.status === "REVISION_REQUIRED") && (
          <div className="admin-notice admin-notice--amber">
            <AlertTriangle size={14} strokeWidth={1.75} />
            Revision required — a shared KPI was assigned. Rebalance to 100% and resubmit.
          </div>
        )}

        {/* ── Action Bar ──────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>
              {goals.length} goal{goals.length !== 1 ? "s" : ""} · {cycle?.year}
            </p>
            {hasEditableGoals && Math.round(totalWeightage) !== 100 && goals.length > 0 && (
              <p style={{ fontSize: 11, marginTop: 4, color: "#F59E0B" }}>
                {totalWeightage.toFixed(1)}% / 100% — balance to exactly 100% to submit
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {goals.length < 8 && !allApproved && (
              <button onClick={() => { setEditingGoal(null); setModalOpen(true); }} className="admin-btn">
                <Plus size={12} /> Add Goal
              </button>
            )}
            {canSubmit && (
              <button onClick={handleSubmitAll} className="admin-btn admin-btn--primary">
                <Send size={12} /> Submit for Approval
              </button>
            )}
          </div>
        </div>

        {/* ── Goals Grid ──────────────────────────────────────── */}
        {goals.length === 0 ? (
          <div className="admin-glass" style={{ textAlign: "center", padding: "60px 24px", borderStyle: "dashed" }}>
            <div style={{ margin: "0 auto 14px", width: 44, height: 44, borderRadius: 14, background: "rgba(8,20,47,0.90)", border: "1px solid rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}>
              <Target size={20} strokeWidth={1.25} style={{ color: "#334155" }} />
            </div>
            <div className="admin-empty-title">No goals yet</div>
            <div className="admin-empty-text" style={{ marginTop: 6, marginBottom: 20 }}>Add your first goal to get started for this cycle</div>
            <button onClick={() => { setEditingGoal(null); setModalOpen(true); }} className="admin-btn">
              <Plus size={12} /> Add First Goal
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
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
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </AppShell>
  );
}