import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
import AppShell from "../../components/AppShell";
import {
  Users, BarChart2, AlertTriangle, RefreshCw, Share2,
  TrendingUp, History, Lock, ChevronRight, Download,
  Plus, Eye, EyeOff
} from "lucide-react";
import Analytics from "./Analytics";
import Escalation from "./Escalation";
import { getEscalationSummary } from "../../api/escalation";
import {
  activateCycle, createCycle, downloadAchievementReport,
  downloadAchievementCSV, getAdminGoals, getAdminUsers,
  getAuditLogs, getCompletionDashboard, getCycles,
  pushSharedGoal, unlockGoal, updateUserManager,
  startCompletionStream, openQuarter, toggleCheckinWindow,
  autoScheduleWindows,
} from "../../api/admin";

const UOM_OPTIONS = [
  { value: "NUMERIC_MIN", label: "Higher is better" },
  { value: "NUMERIC_MAX", label: "Lower is better" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "ZERO", label: "Zero = Success" },
];

const initialSharedGoal = {
  title: "", thrust_area_id: "", uom_type: "NUMERIC_MIN",
  target: "", weightage: "", employee_ids: [],
};

const initialCycle = {
  year: new Date().getFullYear(),
  phase: "Goal Setting", start_date: "", end_date: "", is_active: false,
};

const STATUS_LABELS = {
  DRAFT: "Draft", SUBMITTED: "Submitted", APPROVED: "Approved",
  RETURNED: "Returned", REVISION_REQUIRED: "Revision required",
};

const TABS = [
  { id: "overview",      label: "Overview",      icon: Users },
  { id: "analytics",    label: "Analytics",      icon: BarChart2 },
  { id: "escalation",    label: "Escalation",    icon: AlertTriangle },
  { id: "cycles",       label: "Cycles",         icon: RefreshCw },
  { id: "shared_goals", label: "Shared Goals",   icon: Share2 },
  { id: "completion",   label: "Completion",    icon: TrendingUp },
  { id: "audit",         label: "Audit Trail",   icon: History },
  { id: "goals",         label: "Goal Unlock",   icon: Lock },
  { id: "users",         label: "Hierarchy",     icon: Users },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion]   = useState([]);
  const [cycles, setCycles]           = useState([]);
  const [users, setUsers]             = useState([]);
  const [goals, setGoals]             = useState([]);
  const [auditLogs, setAuditLogs]      = useState([]);
  const [thrustAreas, setThrustAreas]  = useState([]);
  const [sharedGoal, setSharedGoal]    = useState(initialSharedGoal);
  const [cycleForm, setCycleForm]      = useState(initialCycle);
  const [activeTab, setActiveTab]      = useState("overview");
  const [hasActiveEscalations, setHasActiveEscalations] = useState(false);

  const employees = useMemo(() => users.filter((u) => u.role === "EMPLOYEE"), [users]);
  const managers = useMemo(() => users.filter((u) => u.role === "MANAGER"), [users]);
  const stats = useMemo(() => ({
    total:    completion.length,
    submitted: completion.filter((r) => r.goalsSubmitted).length,
    approved:  completion.filter((r) => r.goalsApproved).length,
    q1:        completion.filter((r) => r.checkInsCompleted?.includes("Q1")).length,
  }), [completion]);

  const activeCycleName = cycles.find((c) => c.is_active)?.year || "No active cycle";

  const refresh = async () => {
    const [comp, cyc, usr, gl, aud, th, esc] = await Promise.all([
      getCompletionDashboard(), getCycles(), getAdminUsers(),
      getAdminGoals(), getAuditLogs(), getThrustAreas(),
      getEscalationSummary().catch(() => ({ data: { total_active: 0 } })),
    ]);
    setCompletion(comp.data); setCycles(cyc.data); setUsers(usr.data);
    setGoals(gl.data); setAuditLogs(aud.data); setThrustAreas(th.data);
    setHasActiveEscalations(esc.data.total_active > 0);
  };

  useEffect(() => {
    let sseHandle;
    refresh().catch(() => toast.error("Failed to load dashboard")).finally(() => setLoading(false));
    try {
      sseHandle = startCompletionStream((p) => { if (p?.data) setCompletion(p.data); });
    } catch { /* ignore */ }
    return () => { sseHandle?.close?.(); };
  }, []);

  const handleActivateCycle   = async (id) => { try { toast.success((await activateCycle(id)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleOpenQuarter     = async (cid, q) => { try { toast.success((await openQuarter(cid, q)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleToggleWindow     = async (id) => { try { toast.success((await toggleCheckinWindow(id)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleAutoSchedule    = async (id) => { try { toast.success((await autoScheduleWindows(id)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleCreateCycle     = async (e) => { e.preventDefault(); try { await createCycle(cycleForm); toast.success("Cycle created"); setCycleForm(initialCycle); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handlePushSharedGoal  = async (e) => {
    e.preventDefault();
    try {
      const res = await pushSharedGoal({ ...sharedGoal, target: +sharedGoal.target, weightage: +sharedGoal.weightage });
      toast.success(res.data.message || res.data.warning); setSharedGoal(initialSharedGoal); await refresh();
    } catch (e) {
      const d = e.response?.data?.detail;
      if (d?.blocked) {
        toast.error(`${d.message}\n${d.blocked.map((b) => `  - ${b.name}: ${b.approved_total}% + ${b.shared_weightage}% = ${b.would_be}%`).join("\n")}`);
      } else { toast.error(d || "Failed to push shared goal"); }
    }
  };
  const toggleRecipient       = (id) => setSharedGoal((p) => ({
    ...p, employee_ids: p.employee_ids.includes(id) ? p.employee_ids.filter((x) => x !== id) : [...p.employee_ids, id],
  }));
  const handleManagerChange   = async (eid, mid) => { try { await updateUserManager(eid, mid); toast.success("Manager updated"); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleUnlockGoal      = async (goal) => { if (!confirm(`Unlock "${goal.title}"?`)) return; try { toast.success((await unlockGoal(goal.id)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleDownload         = () => downloadAchievementReport().catch(() => toast.error("Download failed"));
  const handleDownloadCSV      = () => downloadAchievementCSV().catch(() => toast.error("Download failed"));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-base)" }}>
      <div className="skeleton h-4 w-44 rounded" />
    </div>
  );

  return (
    <AppShell user={user} logout={logout} title="Admin Panel" subtitle={`${stats.total} employees · ${activeCycleName}`}>
      <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

      {/* ── Tab Navigation ───────────────────────────────────── */}
      <div className="tabs-row mb-8">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`tab-btn ${activeTab === id ? "active" : ""}`}
          >
            {Icon && <Icon size={13} strokeWidth={1.75} />}
            {label}
            {id === "escalation" && hasActiveEscalations && (
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-8">

        {/* ── Overview ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Platform Overview</h2>
              <div className="flex gap-2">
                <button onClick={handleDownloadCSV} className="btn text-xs"><Download size={12} /> CSV</button>
                <button onClick={handleDownload} className="btn btn-confirm text-xs"><Download size={12} /> Excel</button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <StatCard icon={<Users size={16} strokeWidth={1.5} />} label="Total Employees" value={stats.total} gradient="from-[#0a0f1a] to-[#070b14]" accent="#6366F1" trend={`${employees.length} employees`} />
              <StatCard icon={<Eye size={16} strokeWidth={1.5} />} label="Sheets Submitted" value={stats.submitted} gradient="from-[#1a1000] to-[#0d0800]" accent="#F59E0B" trend={`${stats.submitted} pending review`} />
              <StatCard icon={<Eye size={16} strokeWidth={1.5} />} label="Sheets Approved" value={stats.approved} gradient="from-[#001a0d] to-[#000d08]" accent="#10B981" trend={`${stats.approved} locked this cycle`} />
              <StatCard icon={<TrendingUp size={16} strokeWidth={1.5} />} label="Q1 Check-ins" value={stats.q1} gradient="from-[#0a0a1a] to-[#070714]" accent="#818CF8" trend="Q1 submissions complete" />
              <StatCard icon={<RefreshCw size={16} strokeWidth={1.5} />} label="Active Cycle" value={activeCycleName} gradient="from-[#0a0a1a] to-[#070714]" accent="#6366F1" trend="Current planning cycle" />
              <StatCard icon={<Lock size={16} strokeWidth={1.5} />} label="System Goals" value={goals.length} gradient="from-[#0a0a1a] to-[#070714]" accent="#8892AA" trend="Total goals in system" />
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="aq-card p-4">
                <p className="label mb-3">Employees</p>
                <p className="number-large">{employees.length}</p>
                <p className="micro mt-1">{managers.length} managers</p>
              </div>
              <div className="aq-card p-4">
                <p className="label mb-3">Goal Completion</p>
                <p className="number-large" style={{ color: "var(--score-excellent)" }}>{stats.total ? `${((stats.approved / stats.total) * 100).toFixed(0)}%` : "—"}</p>
                <p className="micro mt-1">{stats.approved} of {stats.total} approved</p>
              </div>
              <div className="aq-card p-4">
                <p className="label mb-3">Active Cycles</p>
                <p className="number-large">{cycles.filter((c) => c.is_active).length}</p>
                <p className="micro mt-1">{cycles.length} total cycles</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analytics"    && <Analytics />}
        {activeTab === "escalation"  && <Escalation />}

        {/* ── Cycles ───────────────────────────────────────── */}
        {activeTab === "cycles" && (
          <div className="space-y-6">
            <div className="aq-card p-6">
              <p className="label mb-4">BRD Check-in Schedule</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { p: "Phase 1 — Goal Setting", w: "1st May", a: "Goal creation, submission & approval" },
                  { p: "Q1 Check-in", w: "July", a: "Progress update — planned vs. actual" },
                  { p: "Q2 Check-in", w: "October", a: "Progress update — planned vs. actual" },
                  { p: "Q3 Check-in", w: "January", a: "Progress update — planned vs. actual" },
                  { p: "Q4 / Annual", w: "March/April", a: "Final achievement capture" },
                ].map((i) => (
                  <div key={i.p} className="rounded-xl border border-white/[0.04] p-3.5" style={{ background: "var(--surface-base)" }}>
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{i.p}</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--score-excellent)" }}>Opens: {i.w}</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{i.a}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {cycles.map((c) => (
                <div
                  key={c.id}
                  className="aq-card p-5"
                  style={c.is_active ? { borderLeft: "3px solid var(--score-excellent)" } : {}}
                >
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="number-small" style={{ color: "var(--text-primary)" }}>{c.year}</span>
                        <span className="status-badge status-locked text-[10px]">{c.phase}</span>
                        {c.is_active && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                      </div>
                      <p className="micro mt-1.5">
                        {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                      </p>
                      {c.is_active && (
                        <div className="flex items-center gap-4 mt-3">
                          <span className={`text-xs font-medium ${c.checkin_window_open ? "text-[var(--score-excellent)]" : "text-[var(--score-poor)]"}`}>
                            {c.checkin_window_open ? "Check-in: OPEN" : "Check-in: CLOSED"}
                          </span>
                          {c.checkin_window_open && c.current_quarter && (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              Quarter: <span className="font-medium" style={{ color: "var(--text-primary)" }}>{c.current_quarter}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {c.is_active && (
                        <>
                          <div className="flex gap-1">
                            {["Q1","Q2","Q3","Q4"].map((q) => (
                              <button key={q} onClick={() => handleOpenQuarter(c.id, q)}
                                className={`btn text-xs py-1 px-2 ${c.current_quarter === q ? "btn-confirm" : ""}`}>{q}</button>
                            ))}
                            {c.current_quarter && <button onClick={() => handleOpenQuarter(c.id, null)} className="btn text-xs py-1 px-2">Close Q</button>}
                          </div>
                          <button onClick={() => handleToggleWindow(c.id)}
                            className={`btn text-xs py-1 ${c.checkin_window_open ? "btn-danger" : "btn-confirm"}`}>
                            {c.checkin_window_open ? "Close Window" : "Open Window"}
                          </button>
                          <button onClick={() => handleAutoSchedule(c.id)} className="btn text-xs py-1">BRD Schedule</button>
                        </>
                      )}
                      {!c.is_active && <button onClick={() => handleActivateCycle(c.id)} className="btn btn-accent text-xs py-1">Activate</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateCycle} className="aq-card p-6 space-y-5">
              <h3 className="section-title">Create New Cycle</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Year", key: "year", type: "number" },
                  { label: "Phase Name", key: "phase", type: "text" },
                  { label: "Start Date", key: "start_date", type: "date" },
                  { label: "End Date", key: "end_date", type: "date" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="label block mb-1.5">{label}</label>
                    <input type={type} value={cycleForm[key]} onChange={(e) => setCycleForm({ ...cycleForm, [key]: e.target.value })} className="aq-input w-full" required />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                  <input type="checkbox" checked={cycleForm.is_active} onChange={(e) => setCycleForm({ ...cycleForm, is_active: e.target.checked })} />
                  Activate immediately
                </label>
                <button type="submit" className="btn btn-confirm"><Plus size={13} /> Create Cycle</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Shared Goals ──────────────────────────────────── */}
        {activeTab === "shared_goals" && (
          <div className="aq-card p-6 space-y-5" style={{ background: "var(--surface-elevated)", borderColor: "rgba(99,102,241,0.15)" }}>
            <div className="flex items-center gap-3 mb-1">
              <span className="flex items-center justify-center h-8 w-8 rounded-xl border border-[var(--accent-border)] text-[var(--accent)]" style={{ background: "var(--accent-glow)" }}>
                <Share2 size={14} strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="section-title">KPI Push</h3>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Deploy shared KPIs across selected employees</p>
              </div>
            </div>
            <form onSubmit={handlePushSharedGoal} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-1.5">KPI Title</label>
                  <input value={sharedGoal.title} onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })} className="aq-input w-full" placeholder="e.g. Achieve Q3 Revenue Target" required />
                </div>
                <div>
                  <label className="label block mb-1.5">Thrust Area</label>
                  <select value={sharedGoal.thrust_area_id} onChange={(e) => setSharedGoal({ ...sharedGoal, thrust_area_id: e.target.value })} className="aq-input w-full" required>
                    <option value="">Select area...</option>
                    {thrustAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label block mb-1.5">Measurement</label>
                  <select value={sharedGoal.uom_type} onChange={(e) => setSharedGoal({ ...sharedGoal, uom_type: e.target.value })} className="aq-input w-full">
                    {UOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label block mb-1.5">Target</label>
                    <input type="number" step="any" value={sharedGoal.target} onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })} className="aq-input w-full" placeholder="0" required />
                  </div>
                  <div>
                    <label className="label block mb-1.5">Weightage %</label>
                    <input type="number" min="5" max="100" value={sharedGoal.weightage} onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })} className="aq-input w-full" placeholder="10" required />
                  </div>
                </div>
              </div>
              <div>
                <label className="label block mb-2">Recipients ({sharedGoal.employee_ids.length})</label>
                <div className="rounded-xl border border-white/[0.04] overflow-hidden" style={{ background: "var(--surface-base)" }}>
                  {employees.length === 0 ? (
                    <p className="text-center text-xs py-8" style={{ color: "var(--text-muted)" }}>No employees found</p>
                  ) : employees.map((emp) => {
                    const sel = sharedGoal.employee_ids.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-white/[0.03] last:border-0" style={{ color: "var(--text-secondary)" }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleRecipient(emp.id)} />
                        <span className="text-sm font-medium" style={{ color: sel ? "var(--text-primary)" : undefined }}>{emp.name}</span>
                        <span className="micro ml-auto">{emp.department || "General"}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <button type="submit" disabled={sharedGoal.employee_ids.length === 0}
                className="btn btn-accent w-full disabled:opacity-35">
                <Share2 size={13} /> Deploy KPI to {sharedGoal.employee_ids.length} employee{sharedGoal.employee_ids.length !== 1 ? "s" : ""}
              </button>
            </form>
          </div>
        )}

        {/* ── Completion ───────────────────────────────────── */}
        {activeTab === "completion" && (
          <div className="aq-card p-0 overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="aq-table w-full">
                <thead>
                  <tr>
                    {["Employee","Department","Goals","Check-ins"].map((c) => (
                      <th key={c} className="text-left">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completion.map((row) => (
                    <tr key={row.employee}>
                      <td className="font-medium">{row.employee}</td>
                      <td className="text-[var(--text-muted)]">{row.department}</td>
                      <td>
                        <span className={`status-badge ${
                          row.goalsApproved ? "status-approved" : row.goalsSubmitted ? "status-submitted" : "status-draft"
                        }`}>
                          {row.goalsApproved ? "Approved" : row.goalsSubmitted ? "Submitted" : "Draft"}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {row.checkInsCompleted?.length > 0
                            ? row.checkInsCompleted.map((q) => <span key={q} className="score-badge excellent">{q}</span>)
                            : <span className="text-[var(--text-disabled)] text-xs">—</span>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Goal Unlock ───────────────────────────────────── */}
        {activeTab === "goals" && (
          <div className="space-y-4">
            <div className="notice-bar red text-xs">
              Warning: Unlocking an approved goal returns it to DRAFT and clears manager locks.
            </div>
            <div className="aq-card p-0 overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="aq-table w-full">
                  <thead>
                    <tr>
                      {["Goal","Owner","Area","Status","Weight"].map((c) => <th key={c}>{c}</th>)}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((g) => (
                      <tr key={g.id}>
                        <td className="font-medium max-w-[200px] truncate">{g.title}</td>
                        <td className="text-[var(--text-muted)]">{g.owner}</td>
                        <td className="text-[var(--text-muted)]">{g.thrustArea}</td>
                        <td><span className={`status-badge ${g.status === "APPROVED" ? "status-approved" : "status-submitted"}`}>{g.status}</span></td>
                        <td className="mono">{g.weightage}%</td>
                        <td className="text-right pr-5">
                          <button onClick={() => handleUnlockGoal(g)} disabled={g.status !== "APPROVED"}
                            className="btn btn-danger py-1 text-xs disabled:opacity-30">
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

        {/* ── Hierarchy ──────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="aq-card p-5">
              <p className="label mb-4">Employee Hierarchy</p>
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-3 px-4 rounded-xl border border-white/[0.04]" style={{ background: "var(--surface-base)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{emp.name}</p>
                      <p className="micro">{emp.email} · {emp.department || "General"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="micro">Reports to:</span>
                      <select value={emp.manager_id || ""} onChange={(e) => handleManagerChange(emp.id, e.target.value)}
                        className="aq-input w-44 py-1.5 text-xs" style={{ background: "var(--surface-card)" }}>
                        <option value="">— None —</option>
                        {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="aq-card p-5">
              <p className="label mb-4">Managers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {managers.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.04]" style={{ background: "var(--surface-base)" }}>
                    <div className="avatar text-[10px]">{m.name.split(" ").filter(Boolean).slice(0,2).map((p) => p[0]?.toUpperCase()).join("")}</div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                      <p className="micro">{m.email}</p>
                    </div>
                    <span className="status-badge status-locked ml-auto text-[10px]">Manager</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Audit Trail ──────────────────────────────────── */}
        {activeTab === "audit" && (
          <div className="aq-card p-0 overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="aq-table w-full">
                <thead>
                  <tr>
                    {["When","Action","Goal","Field","Old","New","By"].map((c) => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-12 text-xs" style={{ color: "var(--text-muted)" }}>No audit logs yet</td></tr>
                  )}
                  {auditLogs.map((log) => {
                    const badge = getAuditBadge(log.action_type, log.category);
                    return (
                      <tr key={log.id} className="border-b border-white/[0.03]">
                        <td className="text-[var(--text-disabled)] text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3">
                          <span className={`status-badge text-[10px] ${badge.cls}`}>{badge.icon} {log.action_type || log.field}</span>
                          {log.reason && log.reason !== "null" && <p className="text-[10px] mt-1 leading-tight" style={{ color: "var(--text-disabled)" }}>{log.reason}</p>}
                        </td>
                        <td className="text-sm font-medium max-w-[160px] truncate" style={{ color: "var(--text-primary)" }}>{log.goal_title || "—"}</td>
                        <td className="text-[var(--text-muted)] text-xs">{log.field}</td>
                        <td className="text-[#EF4444] text-xs font-mono">{log.old_value || "—"}</td>
                        <td className="text-[var(--score-excellent)] text-xs font-mono">{log.new_value || "—"}</td>
                        <td>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            log.category === "SYSTEM_ACTION" ? "bg-[#1a1a2e] text-[#6366F1]" :
                            log.category === "APPROVAL_ACTION" ? "bg-[#1a1a0a] text-[#F59E0B]" :
                            "bg-[#0d1a0d] text-[var(--score-excellent)]"
                          }`}>
                            {log.category === "SYSTEM_ACTION" ? "System" : log.category === "APPROVAL_ACTION" ? "Approval" : "User"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

function StatCard({ icon, label, value, gradient, accent, trend }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 group transition-all duration-200 hover:-translate-y-px cursor-default"
      style={{ background: `linear-gradient(135deg, ${gradient.split(" ")[1]}, ${gradient.split(" ")[3]})`, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 blur-xl pointer-events-none" style={{ background: accent }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div style={{ color: accent }}>{icon}</div>
        </div>
        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
        <p className="text-2xl font-bold tracking-tight" style={{ color: accent, fontFamily: "'JetBrains Mono',monospace" }}>{value}</p>
        {trend && <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{trend}</p>}
      </div>
    </div>
  );
}

function getAuditBadge(actionType, category) {
  const lc = (actionType || "").toLowerCase();
  if (lc.includes("approved") || category === "APPROVAL_ACTION") return { cls: "status-approved", icon: "✓" };
  if (lc.includes("returned") || lc.includes("revision")) return { cls: "status-returned", icon: "↩" };
  if (lc.includes("submitted")) return { cls: "status-submitted", icon: "↑" };
  if (lc.includes("updated") || lc.includes("edited")) return { cls: "bg-[#1a2a3a] text-[#818CF8] border border-[#2a4a6a]", icon: "✎" };
  if (lc.includes("unlocked")) return { cls: "bg-[#2a1a1a] text-[#EF4444] border border-[#6a2a2a]", icon: "🔓" };
  if (category === "SYSTEM_ACTION") return { cls: "bg-[#1a1a2e] text-[#6366F1] border border-[#333366]", icon: "⚙" };
  return { cls: "status-draft", icon: "•" };
}