import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
import AppShell from "../../components/AppShell";
import ScoreBadge from "../../components/ScoreBadge";
import { BarChart2, AlertTriangle } from "lucide-react";
import Analytics from "./Analytics";
import Escalation from "./Escalation";
import { getEscalationSummary } from "../../api/escalation";
import {
  activateCycle,
  createCycle,
  downloadAchievementReport,
  downloadAchievementCSV,
  getAdminGoals,
  getAdminUsers,
  getAuditLogs,
  getCompletionDashboard,
  getCycles,
  pushSharedGoal,
  unlockGoal,
  updateUserManager,
  startCompletionStream,
  openQuarter,
  toggleCheckinWindow,
  autoScheduleWindows,
} from "../../api/admin";

const UOM_OPTIONS = [
  { value: "NUMERIC_MIN", label: "Higher is better" },
  { value: "NUMERIC_MAX", label: "Lower is better" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero = Success" },
];

const initialSharedGoal = {
  title: "",
  thrust_area_id: "",
  uom_type: "NUMERIC_MIN",
  target: "",
  weightage: "",
  employee_ids: [],
};

const initialCycle = {
  year: new Date().getFullYear(),
  phase: "Goal Setting",
  start_date: "",
  end_date: "",
  is_active: false,
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [sharedGoal, setSharedGoal] = useState(initialSharedGoal);
  const [cycleForm, setCycleForm] = useState(initialCycle);

  const [activeTab, setActiveTab] = useState("overview");
  const [hasActiveEscalations, setHasActiveEscalations] = useState(false);

  const employees = users.filter((u) => u.role === "EMPLOYEE");
  const managers = users.filter((u) => u.role === "MANAGER");

  const stats = useMemo(() => {
    const total = completion.length;
    const submitted = completion.filter((row) => row.goalsSubmitted).length;
    const approved = completion.filter((row) => row.goalsApproved).length;
    const q1 = completion.filter((row) =>
      row.checkInsCompleted?.includes("Q1"),
    ).length;

    return { total, submitted, approved, q1 };
  }, [completion]);

  const refresh = async () => {
    const [
      completionRes,
      cyclesRes,
      usersRes,
      goalsRes,
      auditRes,
      thrustAreasRes,
      escalationSummaryRes,
    ] = await Promise.all([
      getCompletionDashboard(),
      getCycles(),
      getAdminUsers(),
      getAdminGoals(),
      getAuditLogs(),
      getThrustAreas(),
      getEscalationSummary().catch(() => ({ data: { total_active: 0 } })),
    ]);

    setCompletion(completionRes.data);
    setCycles(cyclesRes.data);
    setUsers(usersRes.data);
    setGoals(goalsRes.data);
    setAuditLogs(auditRes.data);
    setThrustAreas(thrustAreasRes.data);
    setHasActiveEscalations(escalationSummaryRes.data.total_active > 0);
  };

  useEffect(() => {
    let sseHandle;

    refresh()
      .catch(() => toast.error("Failed to load admin dashboard"))
      .finally(() => setLoading(false));

    try {
      sseHandle = startCompletionStream((payload) => {
        if (payload?.data) setCompletion(payload.data);
      });
    } catch (e) {
      console.error("Failed to start completion SSE", e);
    }

    return () => {
      if (sseHandle?.close) sseHandle.close();
    };
  }, []);

  const handleActivateCycle = async (id) => {
    try {
      const res = await activateCycle(id);
      toast.success(res.data.message);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to activate cycle");
    }
  };

  const handleOpenQuarter = async (cycleId, quarter) => {
    try {
      const res = await openQuarter(cycleId, quarter);
      toast.success(res.data.message);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to open quarter");
    }
  };

  const handleToggleWindow = async (cycleId) => {
    try {
      const res = await toggleCheckinWindow(cycleId);
      toast.success(res.data.message);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to toggle window");
    }
  };

  const handleAutoSchedule = async (cycleId) => {
    try {
      const res = await autoScheduleWindows(cycleId);
      toast.success(res.data.message);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to auto-schedule");
    }
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    try {
      await createCycle(cycleForm);
      toast.success("Cycle created");
      setCycleForm(initialCycle);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create cycle");
    }
  };

  const handlePushSharedGoal = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...sharedGoal,
        target: Number(sharedGoal.target),
        weightage: Number(sharedGoal.weightage),
      };
      const res = await pushSharedGoal(payload);
      if (res.data.blocked > 0 && res.data.blocked_details) {
        const lines = res.data.blocked_details.map((b) =>
          `  - ${b.employee_name}: current ${b.current_total}% + ${b.shared_weightage}% = ${b.would_be}% (over by ${b.over_by}%)`
        ).join("\n");
        toast.error(`${res.data.warning}\n\nBlocked:\n${lines}`);
      } else {
        toast.success(res.data.message);
      }
      setSharedGoal(initialSharedGoal);
      await refresh();
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail?.blocked) {
        const lines = detail.blocked.map((b) =>
          `  - ${b.name}: ${b.approved_total}% + ${b.shared_weightage}% = ${b.would_be}% (over by ${b.would_be - 100}%)`
        ).join("\n");
        toast.error(`${detail.message}\n\nBlocked:\n${lines}`);
      } else {
        toast.error(err.response?.data?.detail || "Failed to push shared goal");
      }
    }
  };

  const toggleRecipient = (id) => {
    setSharedGoal((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter((employeeId) => employeeId !== id)
        : [...prev.employee_ids, id],
    }));
  };

  const handleManagerChange = async (employeeId, managerId) => {
    try {
      await updateUserManager(employeeId, managerId);
      toast.success("Manager updated");
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update manager");
    }
  };

  const handleUnlockGoal = async (goal) => {
    if (!confirm(`Unlock "${goal.title}" and return it to draft?`)) return;
    try {
      const res = await unlockGoal(goal.id);
      toast.success(res.data.message);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to unlock goal");
    }
  };

  const handleDownload = async () => {
    try {
      await downloadAchievementReport();
    } catch {
      toast.error("Failed to download report");
    }
  };

  const handleDownloadCSV = async () => {
    try {
      await downloadAchievementCSV();
    } catch {
      toast.error("Failed to download CSV");
    }
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "escalation", label: "Escalation", icon: AlertTriangle },
    { id: "cycles", label: "Cycles" },
    { id: "shared_goals", label: "Shared Goals" },
    { id: "completion", label: "Completion" },
    { id: "audit", label: "Audit Trail" },
    { id: "goals", label: "Goal Unlock" },
    { id: "users", label: "Hierarchy" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="skeleton h-4 w-44 rounded" />
      </div>
    );
  }

  const activeCycleName = cycles.find(c => c.is_active)?.year || "No active cycle";

  return (
    <AppShell
      user={user}
      logout={logout}
      title="Admin Panel"
      subtitle={`Active Year: ${activeCycleName}`}
    >
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      <div className="space-y-6">
        {/* Horizontal Navigation Tabs */}
        <div className="quarter-tabs-row overflow-x-auto flex-nowrap scrollbar-thin flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`quarter-tab min-w-[90px] text-center flex items-center justify-center gap-1.5 relative ${
                  activeTab === tab.id ? "active" : ""
                }`}
              >
                {Icon && <Icon size={14} strokeWidth={1.5} />}
                <span>{tab.label}</span>
                {tab.id === "escalation" && hasActiveEscalations && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#c44a4a] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview (2x3 Grid) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="label text-[#909090]">Admin Overview</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadCSV}
                  className="btn text-xs py-1"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleDownload}
                  className="btn btn-confirm text-xs py-1"
                >
                  Export Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="aq-card stat-card">
                <span className="label">Total Employees</span>
                <span className="number-large mt-3 block">{stats.total}</span>
              </div>
              <div className="aq-card stat-card">
                <span className="label">Sheets Submitted</span>
                <span className="number-large mt-3 block text-[#c49a2a]">{stats.submitted}</span>
              </div>
              <div className="aq-card stat-card">
                <span className="label">Sheets Approved</span>
                <span className="number-large mt-3 block text-[#4d9966]">{stats.approved}</span>
              </div>
              <div className="aq-card stat-card">
                <span className="label">Q1 Submissions</span>
                <span className="number-large mt-3 block text-[#4a7ac4]">{stats.q1}</span>
              </div>
              <div className="aq-card stat-card">
                <span className="label">Active Cycle</span>
                <span className="number-large mt-3 block text-[#e8e8e8]">{activeCycleName}</span>
              </div>
              <div className="aq-card stat-card">
                <span className="label">Total System Goals</span>
                <span className="number-large mt-3 block text-[#909090]">{goals.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Analytics */}
        {activeTab === "analytics" && <Analytics />}

        {/* Tab: Escalation */}
        {activeTab === "escalation" && <Escalation />}

        {/* Tab 2: Cycles Management */}
        {activeTab === "cycles" && (
          <div className="space-y-6">
            {/* BRD Schedule Reference */}
            <div className="aq-card p-5">
              <h3 className="text-xs font-semibold text-[#909090] uppercase tracking-[0.06em] mb-4">Check-in Schedule (BRD Reference)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { period: "Phase 1 — Goal Setting", window: "1st May", action: "Goal Creation, Submission & Approval" },
                  { period: "Q1 Check-in", window: "July", action: "Progress Update — Planned vs. Actual" },
                  { period: "Q2 Check-in", window: "October", action: "Progress Update — Planned vs. Actual" },
                  { period: "Q3 Check-in", window: "January", action: "Progress Update — Planned vs. Actual" },
                  { period: "Q4 / Annual", window: "March / April", action: "Final Achievement Capture" },
                ].map((item) => (
                  <div key={item.period} className="border border-[#222222] bg-[#0d0d0d] rounded-lg p-3">
                    <p className="text-xs font-medium text-[#f5f5f5]">{item.period}</p>
                    <p className="text-[10px] text-[#4d9966] mt-1">Opens: {item.window}</p>
                    <p className="text-[10px] text-[#555555] mt-1">{item.action}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className={`aq-card relative pl-6 pr-5 py-4 border border-[#222222] ${
                    cycle.is_active ? "border-l-[3px] border-l-[#4d9966]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="mono text-base font-semibold text-[#f5f5f5]">{cycle.year}</span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#909090] ml-3 bg-[#161616] border border-[#222222] px-2 py-0.5 rounded">
                        {cycle.phase}
                      </span>
                      <p className="micro text-[#555555] mt-1.5">
                        Window: {new Date(cycle.start_date).toLocaleDateString()} to {new Date(cycle.end_date).toLocaleDateString()}
                      </p>
                      {cycle.is_active && (
                        <div className="flex items-center gap-3 mt-3">
                          <span className={`text-xs font-medium ${cycle.checkin_window_open ? "text-[#4d9966]" : "text-[#c44a4a]"}`}>
                            {cycle.checkin_window_open ? "Check-in window: OPEN" : "Check-in window: CLOSED"}
                          </span>
                          {cycle.checkin_window_open && cycle.current_quarter && (
                            <span className="text-xs text-[#909090]">
                              Active Quarter: <span className="text-[#e8e8e8] font-medium">{cycle.current_quarter}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {cycle.is_active && (
                        <>
                          <div className="flex gap-1">
                            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                              <button
                                key={q}
                                onClick={() => handleOpenQuarter(cycle.id, q)}
                                className={`btn text-xs py-1 px-2 ${
                                  cycle.current_quarter === q ? "btn-confirm" : ""
                                }`}
                              >
                                {q}
                              </button>
                            ))}
                            {cycle.current_quarter && (
                              <button
                                onClick={() => handleOpenQuarter(cycle.id, null)}
                                className="btn text-xs py-1 px-2"
                              >
                                Close
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleWindow(cycle.id)}
                            className={`btn text-xs py-1 ${cycle.checkin_window_open ? "btn-danger" : "btn-confirm"}`}
                          >
                            {cycle.checkin_window_open ? "Close Window" : "Open Window"}
                          </button>
                          <button
                            onClick={() => handleAutoSchedule(cycle.id)}
                            className="btn text-xs py-1"
                            title="Auto-schedule windows per BRD"
                          >
                            BRD Schedule
                          </button>
                        </>
                      )}
                      {!cycle.is_active && (
                        <button
                          onClick={() => handleActivateCycle(cycle.id)}
                          className="btn text-xs py-1"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateCycle} className="aq-card p-5 space-y-4">
              <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">Create New Cycle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Year</label>
                  <input
                    type="number"
                    value={cycleForm.year}
                    onChange={(e) => setCycleForm({ ...cycleForm, year: e.target.value })}
                    className="aq-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Phase Name</label>
                  <input
                    value={cycleForm.phase}
                    onChange={(e) => setCycleForm({ ...cycleForm, phase: e.target.value })}
                    className="aq-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={cycleForm.start_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                    className="aq-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={cycleForm.end_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                    className="aq-input w-full"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-[#909090] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cycleForm.is_active}
                    onChange={(e) => setCycleForm({ ...cycleForm, is_active: e.target.checked })}
                  />
                  Automatically activate this cycle
                </label>
                <button className="btn btn-confirm">Create Cycle</button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Shared Goal Push */}
        {activeTab === "shared_goals" && (
          <form onSubmit={handlePushSharedGoal} className="aq-card p-5 space-y-4">
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">Departmental KPI Push</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">KPI Title</label>
                <input
                  value={sharedGoal.title}
                  onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })}
                  className="aq-input w-full"
                  placeholder="Enter shared KPI title"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Thrust Area</label>
                  <select
                    value={sharedGoal.thrust_area_id}
                    onChange={(e) => setSharedGoal({ ...sharedGoal, thrust_area_id: e.target.value })}
                    className="aq-input w-full"
                    required
                  >
                    <option value="">Select thrust area...</option>
                    {thrustAreas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Unit of Measurement</label>
                  <select
                    value={sharedGoal.uom_type}
                    onChange={(e) => setSharedGoal({ ...sharedGoal, uom_type: e.target.value })}
                    className="aq-input w-full"
                  >
                    {UOM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Target</label>
                  <input
                    type="number"
                    step="any"
                    value={sharedGoal.target}
                    onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })}
                    className="aq-input w-full"
                    placeholder="Target"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Weightage (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={sharedGoal.weightage}
                    onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })}
                    className="aq-input w-full"
                    placeholder="Weightage"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#909090] uppercase tracking-[0.06em] mb-1.5">Select Recipients</label>
                <div className="border border-[#222222] bg-[#0d0d0d] rounded-lg max-h-52 overflow-y-auto divide-y divide-[#161616]">
                  {employees.map((employee) => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs text-[#909090] cursor-pointer hover:bg-[#111111] transition-colors animate-pulse-subtle"
                    >
                      <input
                        type="checkbox"
                        checked={sharedGoal.employee_ids.includes(employee.id)}
                        onChange={() => toggleRecipient(employee.id)}
                      />
                      <span className="text-[#f5f5f5] font-medium">{employee.name}</span>
                      <span className="micro text-[#555555] ml-auto">{employee.department || "General"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                disabled={sharedGoal.employee_ids.length === 0}
                className="btn btn-confirm w-full mt-2"
              >
                Push to {sharedGoal.employee_ids.length || 0} employee(s)
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Completion Dashboard */}
        {activeTab === "completion" && (
          <div className="aq-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="aq-table w-full">
                <thead>
                  <tr>
                    <th className="text-left font-semibold">Employee</th>
                    <th className="text-left font-semibold">Department</th>
                    <th className="text-left font-semibold">Goals Submission</th>
                    <th className="text-left font-semibold">Check-ins Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {completion.map((row) => (
                    <tr key={row.employee} className="hover:bg-[#161616]/30 transition-colors">
                      <td className="text-[#f5f5f5] font-medium py-3">{row.employee}</td>
                      <td className="text-[#909090] py-3">{row.department}</td>
                      <td className="py-3">
                        <span
                          className={`status-badge ${
                            row.goalsApproved
                              ? "status-approved"
                              : row.goalsSubmitted
                              ? "status-submitted"
                              : "status-draft"
                          }`}
                        >
                          {row.goalsApproved ? "APPROVED" : row.goalsSubmitted ? "SUBMITTED" : "DRAFT"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row.checkInsCompleted?.length > 0 ? (
                            row.checkInsCompleted.map((q) => (
                              <span key={q} className="score-badge excellent text-[10px] px-1.5 py-0.5">
                                {q}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#555555] italic text-xs">None</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Goal Unlock */}
        {activeTab === "goals" && (
          <div className="space-y-4">
            <div className="notice-bar amber">
              WARNING: Unlocking an approved goal will return it to DRAFT state and clear manager locks. Rebalance must be performed manually.
            </div>

            <div className="aq-card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="aq-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left font-semibold">Goal Title</th>
                      <th className="text-left font-semibold">Owner</th>
                      <th className="text-left font-semibold">Thrust Area</th>
                      <th className="text-left font-semibold">Status</th>
                      <th className="text-left font-semibold">Weight</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((goal) => (
                      <tr key={goal.id} className="hover:bg-[#161616]/30 transition-colors">
                        <td className="text-[#f5f5f5] font-medium py-3 max-w-[200px] truncate">{goal.title}</td>
                        <td className="text-[#909090] py-3">{goal.owner}</td>
                        <td className="text-[#909090] py-3">{goal.thrustArea}</td>
                        <td className="py-3">
                          <span
                            className={`status-badge ${
                              goal.status === "APPROVED" ? "status-approved" : "status-submitted"
                            }`}
                          >
                            {goal.status}
                          </span>
                        </td>
                        <td className="mono text-[#e8e8e8] py-3">{goal.weightage}%</td>
                        <td className="text-right py-3 pr-4">
                          <button
                            onClick={() => handleUnlockGoal(goal)}
                            disabled={goal.status !== "APPROVED"}
                            className="btn btn-danger py-1 text-xs"
                          >
                            Unlock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Org Hierarchy */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="aq-card p-5 space-y-4">
              <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">Employee Org Hierarchy</h3>
              <div className="space-y-3">
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between border border-[#222222] bg-[#0d0d0d] rounded-lg p-4 gap-4"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#f5f5f5]">{employee.name}</p>
                      <p className="micro text-[#555555] mt-0.5">{employee.email} · {employee.department || "General"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="micro text-[#555555]">Report to:</span>
                      <select
                        value={employee.manager_id || ""}
                        onChange={(e) => handleManagerChange(employee.id, e.target.value)}
                        className="aq-input w-48 py-1.5 text-xs bg-[#111111]"
                      >
                        <option value="">No manager</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="aq-card p-5 space-y-4">
              <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">System Managers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {managers.map((manager) => (
                  <div key={manager.id} className="flex items-center justify-between border border-[#222222] bg-[#0d0d0d] p-3 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-[#f5f5f5]">{manager.name}</p>
                      <p className="micro text-[#555555] mt-0.5">{manager.email}</p>
                    </div>
                    <span className="status-badge status-submitted text-[10px] px-2.5 py-0.5">
                      Manager
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Audit Trail */}
        {activeTab === "audit" && (
          <div className="aq-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="aq-table w-full">
                <thead>
                  <tr>
                    <th className="text-left font-semibold">When</th>
                    <th className="text-left font-semibold">Goal</th>
                    <th className="text-left font-semibold">Field</th>
                    <th className="text-left font-semibold">Old Value</th>
                    <th className="text-left font-semibold">New Value</th>
                    <th className="text-left font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#161616]/30 transition-colors">
                      <td className="text-[#909090] text-xs py-3">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="text-[#909090] text-xs py-3 max-w-[150px] truncate">
                        {log.goal_title || log.goal_id}
                      </td>
                      <td className="text-[#f5f5f5] font-medium py-3">{log.field}</td>
                      <td className="text-[#c44a4a] text-xs font-mono py-3">{log.old_value || "—"}</td>
                      <td className="text-[#4d9966] text-xs font-mono py-3">{log.new_value || "—"}</td>
                      <td className="text-[#909090] text-xs py-3 italic max-w-[200px] truncate">
                        {log.reason ? `"${log.reason}"` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
