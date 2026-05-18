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
    <div className="admin-page">
      <div className="admin-inner" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="skeleton" style={{ height: 16, width: 180, borderRadius: 8 }} />
      </div>
    </div>
  );

  return (
    <AppShell user={user} logout={logout} title="My Goals" subtitle={cycle ? `${cycle.year} · ${cycle.phase}` : "Active Cycle"}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

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
    </AppShell>
  );
}