import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { getThrustAreas } from "../../api/goals";
import { SkeletonPage } from "../../components/Skeleton";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  Users, BarChart2, AlertTriangle, RefreshCw, Share2,
  TrendingUp, History, Lock, Download, Plus, Eye,
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
  { value: "PERCENTAGE",  label: "Percentage (%)" },
  { value: "TIMELINE",    label: "Timeline" },
  { value: "ZERO",        label: "Zero = Success" },
];

const initialSharedGoal = {
  title: "", thrust_area_id: "", uom_type: "NUMERIC_MIN",
  target: "", weightage: "", employee_ids: [],
};

const initialCycle = {
  year: new Date().getFullYear(),
  phase: "Goal Setting", start_date: "", end_date: "", is_active: false,
};

const TABS = [
  { id: "overview",      label: "Overview",      icon: Users },
  { id: "analytics",     label: "Analytics",      icon: BarChart2 },
  { id: "escalation",    label: "Escalation",    icon: AlertTriangle },
  { id: "cycles",        label: "Cycles",         icon: RefreshCw },
  { id: "shared_goals",  label: "KPI Deploy",     icon: Share2 },
  { id: "completion",    label: "Completion",     icon: TrendingUp },
  { id: "audit",         label: "Audit Trail",    icon: History },
  { id: "goals",         label: "Goal Unlock",   icon: Lock },
  { id: "users",         label: "Hierarchy",     icon: Users },
];

const AtomQuestLogo = () => (
  <div className="admin-logo">
    <div className="admin-logo-mark">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" opacity="0.7"/>
        <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4"/>
        <circle cx="8" cy="8" r="2" fill="white"/>
      </svg>
    </div>
    <div>
      <div className="admin-logo-text">AtomQuest</div>
      <div className="admin-logo-sub">Admin Console</div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion]   = useState([]);
  const [cycles, setCycles]           = useState([]);
  const [users, setUsers]             = useState([]);
  const [goals, setGoals]             = useState([]);
  const [auditLogs, setAuditLogs]     = useState([]);
  const [thrustAreas, setThrustAreas] = useState([]);
  const [sharedGoal, setSharedGoal]   = useState(initialSharedGoal);
  const [cycleForm, setCycleForm]      = useState(initialCycle);
  const [activeTab, setActiveTab]     = useState("overview");
  const [hasActiveEscalations, setHasActiveEscalations] = useState(false);
  const [confirm, setConfirm]        = useState(null);
  const [auditPage, setAuditPage]   = useState(1);
  const AUDIT_PAGE_SIZE = 15;

  const employees = useMemo(() => users.filter((u) => u.role === "EMPLOYEE"), [users]);
  const managers  = useMemo(() => users.filter((u) => u.role === "MANAGER"), [users]);
  const stats = useMemo(() => ({
    total:     completion.length,
    submitted: completion.filter((r) => r.goalsSubmitted).length,
    approved:  completion.filter((r) => r.goalsApproved).length,
    q1:        completion.filter((r) => r.checkInsCompleted?.includes("Q1")).length,
  }), [completion]);

  const activeCycleName = cycles.find((c) => c.is_active)?.year || "No active cycle";
  const totalAuditPages = Math.max(1, Math.ceil(auditLogs.length / AUDIT_PAGE_SIZE));
  const paginatedAuditLogs = auditLogs.slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE);

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

  const handleActivateCycle  = async (id) => { try { toast.success((await activateCycle(id)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleOpenQuarter    = async (cid, q) => { try { toast.success((await openQuarter(cid, q)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleToggleWindow    = async (id) => { try { toast.success((await toggleCheckinWindow(id)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleAutoSchedule    = async (id) => { try { toast.success((await autoScheduleWindows(id)).data.message); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleCreateCycle     = async (e) => { e.preventDefault(); try { await createCycle(cycleForm); toast.success("Cycle created"); setCycleForm(initialCycle); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handlePushSharedGoal  = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...sharedGoal, weightage: +sharedGoal.weightage };
      if (sharedGoal.uom_type === "TIMELINE" && sharedGoal.target) {
        payload.target = new Date(sharedGoal.target).getTime();
      } else {
        payload.target = +sharedGoal.target;
      }
      const res = await pushSharedGoal(payload);
      toast.success(res.data.message || res.data.warning); setSharedGoal(initialSharedGoal); await refresh();
    } catch (e) {
      const d = e.response?.data?.detail;
      if (d?.blocked) {
        toast.error(`${d.message}\n${d.blocked.map((b) => `  - ${b.name}: ${b.approved_total}% + ${b.shared_weightage}% = ${b.would_be}%`).join("\n")}`);
      } else { toast.error(d || "Failed to push shared goal"); }
    }
  };
  const toggleRecipient = (id) => setSharedGoal((p) => ({
    ...p, employee_ids: p.employee_ids.includes(id) ? p.employee_ids.filter((x) => x !== id) : [...p.employee_ids, id],
  }));
  const handleManagerChange = async (eid, mid) => { try { await updateUserManager(eid, mid); toast.success("Manager updated"); await refresh(); } catch (e) { toast.error(e.response?.data?.detail || "Failed"); } };
  const handleUnlockGoal = async (goal) => {
    setConfirm({
      title: "Unlock Goal",
      message: `Unlock "${goal.title}"? The employee will be able to edit this goal again.`,
      confirmLabel: "Unlock",
      danger: true,
      onConfirm: async () => {
        try { toast.success((await unlockGoal(goal.id)).data.message); await refresh(); }
        catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
      },
    });
  };
  const handleDownload = () => downloadAchievementReport().catch(() => toast.error("Download failed"));
  const handleDownloadCSV = () => downloadAchievementCSV().catch(() => toast.error("Download failed"));

  if (loading) return <SkeletonPage cards={4} />;

  return (
    <div className="admin-page">
      <div className="admin-inner">
        <Toaster position="top-right" toastOptions={{ className: "toast-dark" }} />

        {/* ── Topbar ───────────────────────────────────────────── */}
        <div className="admin-topbar">
          <AtomQuestLogo />
          <div className="admin-nav-bar">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`admin-nav-tab ${activeTab === id ? "active" : ""}`}>
                {Icon && <Icon size={12} strokeWidth={1.75} />}
                {label}
                {id === "escalation" && hasActiveEscalations && <span className="admin-nav-dot" />}
              </button>
            ))}
          </div>
          <button onClick={logout} className="admin-btn" style={{ marginLeft: 16 }}>
            Sign out
          </button>
        </div>

        {/* ── Content ──────────────────────────────────────────── */}
        <div className="admin-content">

          {/* ── Overview ─────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="admin-section-head">
                <span className="admin-section-label">Executive Overview</span>
                <div className="admin-action-row">
                  <button onClick={handleDownloadCSV} className="admin-btn admin-btn--sm">
                    <Download size={11} /> CSV
                  </button>
                  <button onClick={handleDownload} className="admin-btn admin-btn--sm admin-btn--primary">
                    <Download size={11} /> Excel
                  </button>
                </div>
              </div>

              <div className="admin-kpi-row">
                <div className="admin-kpi">
                  <Users size={13} strokeWidth={1.5} style={{ color: "#818CF8" }} />
                  <span className="admin-kpi-val">{stats.total}</span>
                  <span className="admin-kpi-lbl">Total</span>
                </div>
                <div className="admin-kpi">
                  <Eye size={13} strokeWidth={1.5} style={{ color: "#F59E0B" }} />
                  <span className="admin-kpi-val">{stats.submitted}</span>
                  <span className="admin-kpi-lbl">Submitted</span>
                </div>
                <div className="admin-kpi">
                  <TrendingUp size={13} strokeWidth={1.5} style={{ color: "#10B981" }} />
                  <span className="admin-kpi-val">{stats.approved}</span>
                  <span className="admin-kpi-lbl">Approved</span>
                </div>
                <div className="admin-kpi">
                  <BarChart2 size={13} strokeWidth={1.5} style={{ color: "#818CF8" }} />
                  <span className="admin-kpi-val">{stats.q1}</span>
                  <span className="admin-kpi-lbl">Q1 Done</span>
                </div>
                <div className="admin-kpi">
                  <RefreshCw size={13} strokeWidth={1.5} style={{ color: "#818CF8" }} />
                  <span className="admin-kpi-val" style={{ fontSize: 13 }}>{activeCycleName}</span>
                  <span className="admin-kpi-lbl">Cycle</span>
                </div>
                <div className="admin-kpi">
                  <Lock size={13} strokeWidth={1.5} style={{ color: "#64748B" }} />
                  <span className="admin-kpi-val">{goals.length}</span>
                  <span className="admin-kpi-lbl">Goals</span>
                </div>
              </div>

              <div className="admin-metrics">
                <div className="admin-metric-card">
                  <span className="admin-metric-lbl">Employees</span>
                  <span className="admin-metric-val">{employees.length}</span>
                  <span className="admin-metric-sub">{managers.length} managers</span>
                </div>
                <div className="admin-metric-card">
                  <span className="admin-metric-lbl">Completion</span>
                  <span className="admin-metric-val" style={{ color: "#10B981" }}>
                    {stats.total ? `${((stats.approved / stats.total) * 100).toFixed(0)}%` : "—"}
                  </span>
                  <span className="admin-metric-sub">{stats.approved}/{stats.total} approved</span>
                </div>
                <div className="admin-metric-card">
                  <span className="admin-metric-lbl">Active Cycles</span>
                  <span className="admin-metric-val">{cycles.filter((c) => c.is_active).length}</span>
                  <span className="admin-metric-sub">{cycles.length} total cycles</span>
                </div>
                <div className="admin-metric-card">
                  <span className="admin-metric-lbl">Escalations</span>
                  <span className="admin-metric-val" style={{ color: hasActiveEscalations ? "#EF4444" : "#64748B" }}>
                    {hasActiveEscalations ? "Active" : "None"}
                  </span>
                  <span className="admin-metric-sub">{hasActiveEscalations ? "Requires attention" : "All clear"}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && <Analytics />}
          {activeTab === "escalation" && <Escalation />}

          {/* ── Cycles ────────────────────────────────────────── */}
          {activeTab === "cycles" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <span className="admin-section-label">BRD Schedule Reference</span>

              <div className="admin-brd-grid">
                {[
                  { p: "Phase 1 — Goal Setting", w: "1st May", a: "Goal creation, submission & approval" },
                  { p: "Q1 Check-in", w: "July", a: "Progress update — planned vs. actual" },
                  { p: "Q2 Check-in", w: "October", a: "Progress update — planned vs. actual" },
                  { p: "Q3 Check-in", w: "January", a: "Progress update — planned vs. actual" },
                  { p: "Q4 / Annual", w: "March/April", a: "Final achievement capture" },
                ].map((i) => (
                  <div key={i.p} className="admin-brd-item">
                    <span className="admin-brd-period">{i.p}</span>
                    <span className="admin-brd-window">Opens: {i.w}</span>
                    <span className="admin-brd-action">{i.a}</span>
                  </div>
                ))}
              </div>

              <div className="admin-section-head">
                <span className="admin-section-label">Performance Cycles</span>
              </div>

              <div className="admin-cycle-list">
                {cycles.map((c) => (
                  <div key={c.id} className={`admin-cycle-row ${c.is_active ? "admin-cycle-row--active" : ""}`}>
                    <div className="admin-cycle-info">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="admin-cycle-year">{c.year}</span>
                        <span className="admin-phase-chip">{c.phase}</span>
                        {c.is_active && <span className="admin-active-dot" />}
                      </div>
                      <span className="admin-cycle-dates">
                        {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                      </span>
                      {c.is_active && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                          <span className={`admin-cycle-status ${c.checkin_window_open ? "admin-cycle-status--open" : "admin-cycle-status--closed"}`}>
                            {c.checkin_window_open ? "Check-in: OPEN" : "Check-in: CLOSED"}
                          </span>
                          {c.checkin_window_open && c.current_quarter && (
                            <span style={{ fontSize: 10, color: "#64748B", fontFamily: "JetBrains Mono" }}>Q{c.current_quarter}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="admin-cycle-controls">
                      {c.is_active ? (
                        <>
                          <div style={{ display: "flex", gap: 4 }}>
                            {["Q1","Q2","Q3","Q4"].map((q) => (
                              <button key={q} onClick={() => handleOpenQuarter(c.id, q)}
                                className={`admin-btn admin-btn--sm ${c.current_quarter === q ? "active" : ""}`}>{q}</button>
                            ))}
                            {c.current_quarter && <button onClick={() => handleOpenQuarter(c.id, null)} className="admin-btn admin-btn--sm">✕</button>}
                          </div>
                          <button onClick={() => handleToggleWindow(c.id)}
                            className={`admin-btn admin-btn--sm ${c.checkin_window_open ? "danger" : "confirm"}`}>
                            {c.checkin_window_open ? "Close" : "Open"}
                          </button>
                          <button onClick={() => handleAutoSchedule(c.id)} className="admin-btn admin-btn--sm">BRD</button>
                        </>
                      ) : (
                        <button onClick={() => handleActivateCycle(c.id)} className="admin-btn admin-btn--sm admin-btn--sm.accent">Activate</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateCycle} className="admin-glass">
                <span className="admin-section-label" style={{ marginBottom: 12, display: "block" }}>Create New Cycle</span>
                <div className="admin-form-grid">
                  {[
                    { label: "Year", key: "year", type: "number" },
                    { label: "Phase", key: "phase", type: "text" },
                    { label: "Start", key: "start_date", type: "date" },
                    { label: "End", key: "end_date", type: "date" },
                  ].map(({ label, key, type }) => (
                    <div key={key} className="admin-form-field">
                      <label className="admin-label">{label}</label>
                      <input type={type} value={cycleForm[key]} onChange={(e) => setCycleForm({ ...cycleForm, [key]: e.target.value })} className="admin-input" required />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                  <label className="admin-check-label">
                    <input type="checkbox" checked={cycleForm.is_active} onChange={(e) => setCycleForm({ ...cycleForm, is_active: e.target.checked })} />
                    Activate immediately
                  </label>
                  <button type="submit" className="admin-btn admin-btn--accent">
                    <Plus size={11} /> Create Cycle
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Shared Goals ──────────────────────────────────── */}
          {activeTab === "shared_goals" && (
            <div className="admin-glass admin-glass--accent" style={{ borderColor: "rgba(99,102,241,0.20)" }}>
              <div className="admin-glass-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="admin-header-icon">
                    <Share2 size={13} strokeWidth={1.75} />
                  </div>
                  <span className="admin-glass-title">KPI Deployment — Push shared goals to employees</span>
                </div>
              </div>
              <form onSubmit={handlePushSharedGoal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="admin-form-row">
                  <div className="admin-form-field flex-1">
                    <label className="admin-label">KPI Title</label>
                    <input value={sharedGoal.title} onChange={(e) => setSharedGoal({ ...sharedGoal, title: e.target.value })} className="admin-input" placeholder="e.g. Achieve Q3 Revenue Target" required />
                  </div>
                  <div className="admin-form-field" style={{ minWidth: 200 }}>
                    <label className="admin-label">Thrust Area</label>
                    <select value={sharedGoal.thrust_area_id} onChange={(e) => setSharedGoal({ ...sharedGoal, thrust_area_id: e.target.value })} className="admin-input" required>
                      <option value="">Select…</option>
                      {thrustAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-field">
                    <label className="admin-label">Measurement</label>
                    <select value={sharedGoal.uom_type} onChange={(e) => setSharedGoal({ ...sharedGoal, uom_type: e.target.value })} className="admin-input">
                      {UOM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Target</label>
                    <input type={sharedGoal.uom_type === "TIMELINE" ? "date" : "number"} step="any" value={sharedGoal.target} onChange={(e) => setSharedGoal({ ...sharedGoal, target: e.target.value })} className="admin-input" placeholder="0" required />
                  </div>
                  <div className="admin-form-field">
                    <label className="admin-label">Weightage %</label>
                    <input type="number" min="5" max="100" value={sharedGoal.weightage} onChange={(e) => setSharedGoal({ ...sharedGoal, weightage: e.target.value })} className="admin-input" placeholder="10" required />
                  </div>
                </div>
                <div className="admin-form-field">
                  <label className="admin-label">Recipients ({sharedGoal.employee_ids.length} selected)</label>
                  <div className="admin-recipient-list admin-scroll">
                    {employees.length === 0 ? (
                      <div className="admin-empty">
                        <div className="admin-empty-title">No employees found</div>
                        <div className="admin-empty-text">Sync the user directory first</div>
                      </div>
                    ) : employees.map((emp) => {
                      const sel = sharedGoal.employee_ids.includes(emp.id);
                      return (
                        <label key={emp.id} className={`admin-recipient-row ${sel ? "admin-recipient-row--sel" : ""}`}>
                          <input type="checkbox" checked={sel} onChange={() => toggleRecipient(emp.id)} />
                          <span className="admin-recipient-name">{emp.name}</span>
                          <span className="admin-recipient-dept">{emp.department || "—"}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <button type="submit" disabled={sharedGoal.employee_ids.length === 0}
                  className="admin-btn admin-btn--accent" style={{ width: "100%" }}>
                  <Share2 size={12} /> Deploy to {sharedGoal.employee_ids.length} employee{sharedGoal.employee_ids.length !== 1 ? "s" : ""}
                </button>
              </form>
            </div>
          )}

          {/* ── Completion ──────────────────────────────────────── */}
          {activeTab === "completion" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="admin-section-head">
                <span className="admin-section-label">Employee Goal Completion</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{completion.length} employees tracked</span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>{["Employee","Department","Goals Status","Check-ins"].map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {completion.map((row) => (
                      <tr key={row.employee}>
                        <td className="admin-td-primary">{row.employee}</td>
                        <td className="admin-td-muted">{row.department}</td>
                        <td>
                          <span className={`admin-badge ${
                            row.goalsApproved ? "admin-badge--approve" : row.goalsSubmitted ? "admin-badge--submit" : "admin-badge--draft"
                          }`}>
                            {row.goalsApproved ? "Approved" : row.goalsSubmitted ? "Submitted" : "Draft"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {row.checkInsCompleted?.length > 0
                              ? row.checkInsCompleted.map((q) => (
                                <span key={q} style={{
                                  fontFamily: "JetBrains Mono", fontSize: 10, padding: "2px 8px",
                                  borderRadius: 6, background: "rgba(16,185,129,0.12)", color: "#10B981",
                                  fontWeight: 600
                                }}>{q}</span>
                              ))
                              : <span style={{ fontSize: 11, color: "#334155" }}>—</span>
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

          {/* ── Goal Unlock ─────────────────────────────────────── */}
          {activeTab === "goals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="admin-notice admin-notice--red" style={{ fontSize: 11 }}>
                Unlocking clears manager locks — employee must rebalance and resubmit.
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>{["Goal","Owner","Thrust Area","Status","Weight"].map((c) => <th key={c}>{c}</th>)}<th /></tr>
                  </thead>
                  <tbody>
                    {goals.map((g) => (
                      <tr key={g.id}>
                        <td className="admin-td-primary" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{g.title}</td>
                        <td className="admin-td-muted">{g.owner}</td>
                        <td className="admin-td-muted">{g.thrustArea}</td>
                        <td><span className={`admin-badge ${g.status === "APPROVED" ? "admin-badge--approve" : "admin-badge--submit"}`}>{g.status}</span></td>
                        <td className="admin-td-mono">{g.weightage}%</td>
                        <td className="admin-td-action">
                          <button onClick={() => handleUnlockGoal(g)} disabled={g.status !== "APPROVED"}
                            className="admin-btn admin-btn--sm danger">Unlock</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Hierarchy ───────────────────────────────────────── */}
          {activeTab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="admin-glass">
                <div className="admin-glass-header">
                  <span className="admin-glass-title">Employee Hierarchy — Assign reporting managers</span>
                </div>
                <div className="admin-emp-list">
                  {employees.map((emp) => (
                    <div key={emp.id} className="admin-emp-row">
                      <div className="admin-emp-info">
                        <span className="admin-emp-name">{emp.name}</span>
                        <span className="admin-emp-meta">{emp.email} · {emp.department || "General"}</span>
                      </div>
                      <div className="admin-emp-selector">
                        <span className="admin-emp-reports">Reports to:</span>
                        <select value={emp.manager_id || ""} onChange={(e) => handleManagerChange(emp.id, e.target.value)}
                          className="admin-input admin-input-sm" style={{ minWidth: 160 }}>
                          <option value="">— None —</option>
                          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="admin-glass">
                <div className="admin-glass-header">
                  <span className="admin-glass-title">Manager Directory</span>
                </div>
                <div className="admin-mgr-grid">
                  {managers.map((m) => (
                    <div key={m.id} className="admin-mgr-card">
                      <div className="admin-mgr-avatar">
                        {m.name.split(" ").filter(Boolean).slice(0,2).map((p) => p[0]?.toUpperCase()).join("")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="admin-emp-name">{m.name}</span>
                        <span className="admin-emp-meta">{m.email}</span>
                      </div>
                      <span className="admin-badge admin-badge--locked" style={{ fontSize: 9 }}>Mgr</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Audit Trail ─────────────────────────────────────── */}
          {activeTab === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="admin-section-head">
                <span className="admin-section-label">System Audit Trail</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{auditLogs.length} events · page {auditPage}</span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>{["Timestamp","Action","Goal","Field","From","To","Category"].map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginatedAuditLogs.length === 0 && (
                      <tr><td colSpan={7} className="admin-td-empty">No audit logs yet</td></tr>
                    )}
                    {paginatedAuditLogs.map((log) => {
                      const badge = getAuditBadge(log.action_type, log.category);
                      return (
                        <tr key={log.id}>
                          <td className="admin-td-time">
                            {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="admin-td-action-cell">
                            <span className={`admin-badge ${badge.cls}`}>{badge.icon} {log.action_type || log.field}</span>
                            {log.reason && log.reason !== "null" && <span className="admin-td-reason">{log.reason}</span>}
                          </td>
                          <td className="admin-td-primary" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>{log.goal_title || "—"}</td>
                          <td className="admin-td-muted">{log.field}</td>
                          <td className="admin-td-val admin-td-val--old">{log.old_value || "—"}</td>
                          <td className="admin-td-val admin-td-val--new">{log.new_value || "—"}</td>
                          <td>
                            <span className={`admin-type-chip ${log.category === "SYSTEM_ACTION" ? "admin-type-chip--sys" : log.category === "APPROVAL_ACTION" ? "admin-type-chip--apr" : "admin-type-chip--usr"}`}>
                              {log.category === "SYSTEM_ACTION" ? "Sys" : log.category === "APPROVAL_ACTION" ? "Apr" : "Usr"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalAuditPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                  <button className="admin-btn admin-btn--sm" onClick={() => setAuditPage((p) => Math.max(1, p - 1))} disabled={auditPage === 1}>← Prev</button>
                  <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#64748B" }}>Page {auditPage} of {totalAuditPages}</span>
                  <button className="admin-btn admin-btn--sm" onClick={() => setAuditPage((p) => Math.min(totalAuditPages, p + 1))} disabled={auditPage === totalAuditPages}>Next →</button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
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
    </div>
  );
}

function getAuditBadge(actionType, category) {
  const lc = (actionType || "").toLowerCase();
  if (lc.includes("approved") || category === "APPROVAL_ACTION") return { cls: "admin-badge--approve", icon: "✓" };
  if (lc.includes("returned") || lc.includes("revision")) return { cls: "admin-badge--return", icon: "↩" };
  if (lc.includes("submitted")) return { cls: "admin-badge--submit", icon: "↑" };
  if (lc.includes("updated") || lc.includes("edited")) return { cls: "admin-badge--locked", icon: "✎" };
  if (lc.includes("unlocked")) return { cls: "admin-badge--return", icon: "🔓" };
  if (category === "SYSTEM_ACTION") return { cls: "admin-badge--locked", icon: "⚙" };
  return { cls: "admin-badge--draft", icon: "•" };
}