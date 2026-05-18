import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
import { getTeamGoals, approveGoals, returnGoal, pushTeamSharedGoal } from "../../api/manager";
import AppShell from "../../components/AppShell";
import EmployeeGoalCard from "../../components/EmployeeGoalCard";
import ReturnReasonModal from "../../components/ReturnReasonModal";
import toast, { Toaster } from "react-hot-toast";
import { Users, Clock, CheckCircle, Target, Send, ShieldAlert } from "lucide-react";

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
        const list = detail.blocked.map((b) =>
          `  - ${b.name}: ${b.approved_total}% + ${b.shared_weightage}% = ${b.would_be}% (exceeds 100% by ${b.would_be - 100}%)`
        ).join("\n");
        toast.error(`${detail.message}\n\nBlocked:\n${list}`);
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
      <div className="admin-page">
        <div className="admin-inner" style={{ alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div className="skeleton" style={{ height: 16, width: 180, borderRadius: 8 }} />
        </div>
      </div>
    );
  }

  return (
    <AppShell user={user} logout={logout} title="Manager Workspace" subtitle={cycle ? `${cycle.year} · ${cycle.phase}` : "Active Cycle"}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* SECTION 1: TEAM OVERVIEW */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="admin-section-label">Team Overview</span>
            <span style={{ fontSize: 11, color: "#475569" }}>{team.length} direct reports</span>
          </div>

          <div className="admin-metrics">
            <div className="admin-metric-card">
              <span className="admin-metric-lbl">Total Reports</span>
              <span className="admin-metric-val">{team.length}</span>
              <span className="admin-metric-sub">direct reports</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-lbl" style={{ color: "#F59E0B" }}>Pending Approvals</span>
              <span className="admin-metric-val" style={{ color: "#F59E0B" }}>{totalPending}</span>
              <span className="admin-metric-sub">awaiting review</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-lbl" style={{ color: "#10B981" }}>Goals Approved</span>
              <span className="admin-metric-val" style={{ color: "#10B981" }}>{totalApproved}</span>
              <span className="admin-metric-sub">goals locked</span>
            </div>
            <div className="admin-metric-card">
              <span className="admin-metric-lbl">Team Score</span>
              <span className="admin-metric-val" style={{ color: "#818CF8" }}>{teamScore}%</span>
              <span className="admin-metric-sub">{totalGoals} total goals</span>
            </div>
          </div>

          {totalPending > 0 && (
            <div className="admin-notice admin-notice--amber">
              <ShieldAlert size={14} />
              <span>{totalPending} goal{totalPending !== 1 ? "s" : ""} awaiting your review and approval.</span>
            </div>
          )}
        </div>

        {/* SECTION 2: KPI PUSH MODULE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="admin-section-label">Strategic Alignment — Departmental KPI Cascade</span>

          <div className="admin-glass" style={{ borderLeft: "3px solid #6366F1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div className="admin-header-icon">
                <Send size={13} strokeWidth={1.75} />
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Departmental KPI Push</span>
                <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Cascade strategic objectives directly to your team members.</p>
              </div>
            </div>

            <form onSubmit={handlePushSharedGoal} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="admin-form-field">
                <label className="admin-label">KPI Title</label>
                <input
                  value={sharedGoal.title}
                  onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })}
                  className="admin-input"
                  placeholder="E.g., Increase Department Q2 Revenue by 15%"
                  required
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-field" style={{ minWidth: 200 }}>
                  <label className="admin-label">Thrust Area</label>
                  <select value={sharedGoal.thrust_area_id} onChange={(e) => setSharedGoal({ ...sharedGoal, thrust_area_id: e.target.value })} className="admin-input" required>
                    <option value="">Select Area...</option>
                    {thrustAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                  </select>
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Measurement</label>
                  <select value={sharedGoal.uom_type} onChange={(e) => setSharedGoal({ ...sharedGoal, uom_type: e.target.value })} className="admin-input">
                    {UOM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Target Value</label>
                  <input type="number" step="any" value={sharedGoal.target} onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })} className="admin-input" placeholder="E.g., 100000" required />
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Weightage %</label>
                  <input type="number" min="10" max="100" value={sharedGoal.weightage} onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })} className="admin-input" placeholder="10 - 100" required />
                </div>
              </div>

              <div className="admin-form-field">
                <label className="admin-label">Assign To Direct Reports ({sharedGoal.employee_ids.length} selected)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {team.length === 0 ? (
                    <span style={{ fontSize: 12, color: "#475569" }}>No team members available</span>
                  ) : (
                    team.map(({ employee }) => {
                      const isSelected = sharedGoal.employee_ids.includes(employee.id);
                      return (
                        <label key={employee.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 14px", borderRadius: 10, border: "1px solid",
                          borderColor: isSelected ? "#6366F1" : "rgba(255,255,255,0.08)",
                          background: isSelected ? "rgba(99,102,241,0.10)" : "rgba(8,20,47,0.80)",
                          color: isSelected ? "#fff" : "#64748B",
                          cursor: "pointer", fontSize: 12, fontWeight: 500,
                          transition: "all 150ms ease",
                        }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSharedGoalRecipient(employee.id)} style={{ display: "none" }} />
                          {employee.name}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  disabled={sharedGoal.employee_ids.length === 0}
                  className="admin-btn admin-btn--accent"
                  style={{ padding: "0 20px" }}
                >
                  <Send size={12} /> Deploy to {sharedGoal.employee_ids.length} Member{sharedGoal.employee_ids.length !== 1 ? 's' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SECTION 3: TEAM MEMBERS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="admin-section-label">Team Workspaces</span>
            <span style={{ fontSize: 11, color: "#475569" }}>{team.length} Members</span>
          </div>

          {team.length === 0 ? (
            <div className="admin-glass" style={{ textAlign: "center", padding: "60px 24px", borderStyle: "dashed" }}>
              <div style={{ margin: "0 auto 16px", width: 48, height: 48, borderRadius: 16, background: "rgba(8,20,47,0.90)", border: "1px solid rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}>
                <Users size={20} style={{ color: "#334155" }} />
              </div>
              <div className="admin-empty-title">No Direct Reports Configured</div>
              <div className="admin-empty-text" style={{ marginTop: 6 }}>Ask your system administrator to update the organizational hierarchy.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
