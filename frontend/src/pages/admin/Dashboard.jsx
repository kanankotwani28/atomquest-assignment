import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
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
    ] = await Promise.all([
      getCompletionDashboard(),
      getCycles(),
      getAdminUsers(),
      getAdminGoals(),
      getAuditLogs(),
      getThrustAreas(),
    ]);

    setCompletion(completionRes.data);
    setCycles(cyclesRes.data);
    setUsers(usersRes.data);
    setGoals(goalsRes.data);
    setAuditLogs(auditRes.data);
    setThrustAreas(thrustAreasRes.data);
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
      toast.success(res.data.message);
      setSharedGoal(initialSharedGoal);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to push shared goal");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Cycles, shared goals, audit trail, exports, and completion
              oversight
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.name}</span>
            <button
              onClick={handleDownload}
              className="text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Export Excel
            </button>
            <button
              onClick={handleDownloadCSV}
              className="text-xs px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
            >
              Export CSV
            </button>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="grid grid-cols-4 gap-4">
          <StatCard label="Employees" value={stats.total} />
          <StatCard label="Submitted" value={stats.submitted} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Q1 check-ins" value={stats.q1} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Cycle Management">
            <div className="space-y-3 mb-5">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between border border-gray-200 rounded-lg p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {cycle.year} · {cycle.phase}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(cycle.start_date).toLocaleDateString()} to{" "}
                      {new Date(cycle.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  {cycle.is_active ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleActivateCycle(cycle.id)}
                      className="text-xs px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Activate
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={handleCreateCycle}
              className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4"
            >
              <input
                type="number"
                value={cycleForm.year}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, year: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Year"
              />
              <input
                value={cycleForm.phase}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, phase: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Phase"
              />
              <input
                type="date"
                value={cycleForm.start_date}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, start_date: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="date"
                value={cycleForm.end_date}
                onChange={(e) =>
                  setCycleForm({ ...cycleForm, end_date: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={cycleForm.is_active}
                  onChange={(e) =>
                    setCycleForm({ ...cycleForm, is_active: e.target.checked })
                  }
                />
                Make active
              </label>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                Create cycle
              </button>
            </form>
          </Panel>

          <Panel title="Shared Goal Push">
            <form onSubmit={handlePushSharedGoal} className="space-y-3">
              <input
                value={sharedGoal.title}
                onChange={(e) =>
                  setSharedGoal({ ...sharedGoal, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Shared goal title"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={sharedGoal.thrust_area_id}
                  onChange={(e) =>
                    setSharedGoal({
                      ...sharedGoal,
                      thrust_area_id: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">Thrust area</option>
                  {thrustAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                <select
                  value={sharedGoal.uom_type}
                  onChange={(e) =>
                    setSharedGoal({ ...sharedGoal, uom_type: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {UOM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="any"
                  value={sharedGoal.target}
                  onChange={(e) =>
                    setSharedGoal({ ...sharedGoal, target: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Target"
                  required
                />
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={sharedGoal.weightage}
                  onChange={(e) =>
                    setSharedGoal({ ...sharedGoal, weightage: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Weightage"
                  required
                />
              </div>

              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                {employees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={sharedGoal.employee_ids.includes(employee.id)}
                      onChange={() => toggleRecipient(employee.id)}
                    />
                    <span>{employee.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {employee.department}
                    </span>
                  </label>
                ))}
              </div>

              <button
                disabled={sharedGoal.employee_ids.length === 0}
                className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-40"
              >
                Push to {sharedGoal.employee_ids.length || 0} employee(s)
              </button>
            </form>
          </Panel>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Completion Dashboard">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-2">Employee</th>
                    <th>Dept</th>
                    <th>Goals</th>
                    <th>Check-ins</th>
                  </tr>
                </thead>
                <tbody>
                  {completion.map((row) => (
                    <tr key={row.employee} className="border-b border-gray-50">
                      <td className="py-2 text-gray-900">{row.employee}</td>
                      <td className="text-gray-500">{row.department}</td>
                      <td>
                        <StatusPill
                          active={row.goalsApproved}
                          label={
                            row.goalsApproved
                              ? "Approved"
                              : row.goalsSubmitted
                                ? "Submitted"
                                : "Open"
                          }
                        />
                      </td>
                      <td className="text-gray-500">
                        {row.checkInsCompleted?.join(", ") || "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Org Hierarchy">
            <div className="space-y-3">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-[1fr_180px] gap-3 items-center"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {employee.email} · {employee.department}
                    </p>
                  </div>
                  <select
                    value={employee.manager_id || ""}
                    onChange={(e) =>
                      handleManagerChange(employee.id, e.target.value)
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">No manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel title="Goal Unlock">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2">Goal</th>
                  <th>Owner</th>
                  <th>Thrust Area</th>
                  <th>Status</th>
                  <th>Weight</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => (
                  <tr key={goal.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">{goal.title}</td>
                    <td className="text-gray-500">{goal.owner}</td>
                    <td className="text-gray-500">{goal.thrustArea}</td>
                    <td>
                      <StatusPill
                        active={goal.status === "APPROVED"}
                        label={goal.status}
                      />
                    </td>
                    <td className="text-gray-500">{goal.weightage}%</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleUnlockGoal(goal)}
                        disabled={goal.status !== "APPROVED"}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                      >
                        Unlock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Audit Trail">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2">When</th>
                  <th>Goal</th>
                  <th>Field</th>
                  <th>Old</th>
                  <th>New</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="text-gray-500">
                      {log.goal_title || log.goal_id}
                    </td>
                    <td className="text-gray-900">{log.field}</td>
                    <td className="text-gray-500">{log.old_value || "-"}</td>
                    <td className="text-gray-500">{log.new_value || "-"}</td>
                    <td className="text-gray-500">{log.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatusPill({ active, label }) {
  return (
    <span
      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {label}
    </span>
  );
}
