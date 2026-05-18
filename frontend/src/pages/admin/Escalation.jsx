import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  getEscalationRules,
  seedEscalationRules,
  updateEscalationRule,
  runEscalationCheck,
  getEscalationLogs,
  resolveEscalation,
  getEscalationSummary
} from "../../api/escalation";
import { AlertTriangle, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";

export default function Escalation() {
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [runResult, setRunResult] = useState(null);

  // Pagination & Filtering
  const [filterResolved, setFilterResolved] = useState("all");
  const [filterRuleType, setFilterRuleType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Flow Diagram Collapse State
  const [flowExpanded, setFlowExpanded] = useState(false);

  // In-line edits tracking for rules
  const [editingRules, setEditingRules] = useState({}); // { rule_type: { threshold_days, is_active } }

  // In-line resolving logs notes tracking
  const [resolvingLogId, setResolvingLogId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");

  const initializeData = async () => {
    setLoading(true);
    try {
      // 1. Seed rules
      await seedEscalationRules();
      // 2. Fetch all data
      await refreshAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to initialize Escalation Module");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    try {
      const [rulesRes, logsRes, summaryRes] = await Promise.all([
        getEscalationRules(),
        getEscalationLogs(),
        getEscalationSummary()
      ]);
      setRules(rulesRes.data);
      setLogs(logsRes.data);
      setSummary(summaryRes.data);

      // Reset editing states
      const edMap = {};
      rulesRes.data.forEach((r) => {
        edMap[r.rule_type] = { threshold_days: r.threshold_days, is_active: r.is_active };
      });
      setEditingRules(edMap);
    } catch (err) {
      console.error(err);
      toast.error("Error refreshing escalation logs");
    }
  };

  useEffect(() => {
    initializeData();
  }, []);

  const handleRuleChange = (type, field, value) => {
    setEditingRules((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleSaveRule = async (type) => {
    const editState = editingRules[type];
    try {
      await updateEscalationRule(type, {
        threshold_days: parseInt(editState.threshold_days, 10),
        is_active: editState.is_active
      });
      toast.success("Rule configuration updated");
      await refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save rule");
    }
  };

  const handleRunCheck = async () => {
    setChecking(true);
    setRunResult(null);
    try {
      const res = await runEscalationCheck();
      setRunResult(res.data);
      toast.success("Escalation check run complete");
      await refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to execute check");
    } finally {
      setChecking(false);
    }
  };

  const handleResolve = async (id) => {
    if (!resolveNotes.trim()) {
      toast.error("Please add resolution notes");
      return;
    }
    try {
      await resolveEscalation(id, resolveNotes);
      toast.success("Escalation resolved successfully");
      setResolvingLogId(null);
      setResolveNotes("");
      await refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resolve escalation");
    }
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  // Filter calculations
  const filteredLogs = logs.filter((log) => {
    const matchesResolved =
      filterResolved === "all"
        ? true
        : filterResolved === "resolved"
        ? log.resolved_at !== null
        : log.resolved_at === null;

    const matchesType =
      filterRuleType === "all" ? true : log.rule_type === filterRuleType;

    return matchesResolved && matchesType;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getRuleLabel = (type) => {
    if (type === "GOAL_NOT_SUBMITTED") return "Goals Not Submitted";
    if (type === "GOAL_NOT_APPROVED") return "Approval Overdue";
    if (type === "CHECKIN_MISSED") return "Check-in Missed";
    return type;
  };

  const getRuleDesc = (type) => {
    if (type === "GOAL_NOT_SUBMITTED") return "Employee has not submitted goals within N days of cycle open";
    if (type === "GOAL_NOT_APPROVED") return "Manager has not approved goals within N days of submission";
    if (type === "CHECKIN_MISSED") return "Quarterly check-in not completed within N days of window opening";
    return "";
  };

  const getDaysOpenColor = (days, resolved) => {
    if (resolved) return "text-[#4d9966]";
    if (days < 7) return "text-[#4d9966]";
    if (days <= 14) return "text-[#c49a2a]";
    return "text-[#c44a4a]";
  };

  const initials = (name = "") => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AQ";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const getDaysOpen = (triggeredAt, resolvedAt) => {
    const end = resolvedAt ? new Date(resolvedAt) : new Date();
    const start = new Date(triggeredAt);
    const diff = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
    return diff;
  };

  // Check if rules states are dirty compared to rules loaded
  const isDirty = (type) => {
    const r = rules.find((x) => x.rule_type === type);
    const ed = editingRules[type];
    if (!r || !ed) return false;
    return r.threshold_days !== parseInt(ed.threshold_days, 10) || r.is_active !== ed.is_active;
  };

  const activeEscCount = summary?.total_active || 0;

  return (
    <div className="space-y-6 pb-10">
      {/* SECTION 1 — Summary row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Escalations */}
        <div
          className="aq-card stat-card transition-all duration-300"
          style={{
            borderLeft: activeEscCount > 0 ? "3px solid #c44a4a" : "3px solid #4d9966"
          }}
        >
          <span className="label text-[#909090]">Active Escalations</span>
          <span
            className={`number-large mt-3 block ${
              activeEscCount > 0 ? "text-[#c44a4a]" : "text-[#4d9966]"
            }`}
          >
            {activeEscCount}
          </span>
        </div>

        {/* Employees Affected */}
        <div className="aq-card stat-card">
          <span className="label text-[#909090]">Employees Affected</span>
          <span className="number-large mt-3 block text-zinc-100">
            {summary?.employees_affected || 0}
          </span>
        </div>

        {/* Resolved This Week */}
        <div className="aq-card stat-card">
          <span className="label text-[#909090]">Resolved This Week</span>
          <span className="number-large mt-3 block text-[#4d9966]">
            {summary?.resolved_this_week || 0}
          </span>
        </div>

        {/* Rules Active */}
        <div className="aq-card stat-card">
          <span className="label text-[#909090]">Rules Active</span>
          <span className="number-large mt-3 block text-zinc-400">
            {rules.filter((r) => r.is_active).length} / {rules.length}
          </span>
        </div>
      </section>

      {/* SECTION 2 — Rule Configuration */}
      <section className="aq-card p-5 border border-[#222222]">
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
            Escalation Rules
          </h3>
          <p className="text-[11px] text-[#555555] mt-1">
            Configure default timeline bounds for system escalations.
          </p>
        </div>

        <div className="space-y-4">
          {rules.map((rule, idx) => {
            const ed = editingRules[rule.rule_type] || {};
            const dirty = isDirty(rule.rule_type);

            return (
              <div key={rule.rule_type}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-1.5">
                  {/* Left: Metadata */}
                  <div className="max-w-md">
                    <span className="text-[13px] font-medium text-[#f0f0f0]">
                      {getRuleLabel(rule.rule_type)}
                    </span>
                    <p className="text-[11px] text-[#555555] mt-0.5">
                      {getRuleDesc(rule.rule_type)}
                    </p>
                  </div>

                  {/* Middle: Threshold Days */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-[#555555] font-semibold">
                      Threshold
                    </span>
                    <input
                      type="number"
                      value={ed.threshold_days || ""}
                      onChange={(e) =>
                        handleRuleChange(rule.rule_type, "threshold_days", e.target.value)
                      }
                      className="w-16 bg-[#161616] text-[#f5f5f5] border border-[#222222] rounded py-1 px-2 text-xs focus:outline-none focus:border-[#404040] mono text-center"
                      min="1"
                      max="90"
                    />
                    <span className="text-[11px] text-[#555555]">days</span>
                  </div>

                  {/* Right: Toggle Switch */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleRuleChange(rule.rule_type, "is_active", !ed.is_active)
                      }
                      className={`relative w-9 h-5 rounded-full border transition-all duration-300 ${
                        ed.is_active
                          ? "bg-[#1a2e1a] border-[#2d5a3d]"
                          : "bg-[#1a1a1a] border-[#2a2a2a]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                          ed.is_active ? "translate-x-4 bg-[#4d9966]" : "translate-x-0 bg-[#333]"
                        }`}
                      />
                    </button>
                    <span className="text-[11px] text-[#555555] min-w-[45px]">
                      {ed.is_active ? "Active" : "Inactive"}
                    </span>

                    {/* Save Button */}
                    <div className="w-12 h-6 flex items-center justify-end">
                      {dirty && (
                        <button
                          onClick={() => handleSaveRule(rule.rule_type)}
                          className="text-[10px] font-semibold text-[#4d9966] hover:underline"
                        >
                          Save
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {idx < rules.length - 1 && <div className="border-t border-[#1a1a1a] mt-4" />}
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#1a1a1a] my-5" />

        <div className="flex flex-col items-center">
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="btn btn-confirm w-full flex items-center justify-center gap-2 py-2"
          >
            {checking ? (
              <>
                <Loader2 className="animate-spin" size={15} />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <AlertTriangle size={15} />
                <span>Run Escalation Check</span>
              </>
            )}
          </button>
          <span className="text-[10px] text-[#555555] mt-2 text-center">
            Checks all active rules against current data and creates escalation logs for overdue
            items.
          </span>
        </div>

        {/* Manual Run Result Display */}
        {runResult && (
          <div className="mt-4 animate-fadeIn">
            {runResult.escalations_created === 0 ? (
              <div className="p-3 bg-[#1a2e1a] border border-[#2d5a3d] rounded-lg text-xs text-[#4d9966] flex items-center gap-2">
                <Check size={14} />
                <span>✓ All clear — no new escalations created.</span>
              </div>
            ) : (
              <div className="p-4 bg-[#2e2a1a] border border-[#c49a2a] rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#c49a2a]">
                  <AlertTriangle size={14} />
                  <span>{runResult.escalations_created} new escalation(s) created</span>
                </div>
                <ul className="text-[11px] text-[#909090] list-disc list-inside space-y-0.5">
                  <li>Goal Not Submitted: {runResult.escalations_by_type.GOAL_NOT_SUBMITTED}</li>
                  <li>Goal Not Approved: {runResult.escalations_by_type.GOAL_NOT_APPROVED}</li>
                  <li>Check-in Missed: {runResult.escalations_by_type.CHECKIN_MISSED}</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SECTION 3 — Escalation Logs */}
      <section className="aq-card p-0 overflow-hidden border border-[#222222]">
        <div className="p-5 border-b border-[#222222] bg-[#111111] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold text-[#f5f5f5] uppercase tracking-[0.06em]">
              Escalation Log
            </h3>
            <p className="text-[11px] text-[#555555] mt-1">
              Complete history of active and resolved team escalations.
            </p>
          </div>

          {/* Filtering Dropdowns */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterResolved}
              onChange={(e) => {
                setFilterResolved(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#161616] text-[#909090] border border-[#222222] rounded py-1 px-2.5 text-xs focus:outline-none focus:border-[#404040]"
            >
              <option value="all">All Logs</option>
              <option value="unresolved">Unresolved</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={filterRuleType}
              onChange={(e) => {
                setFilterRuleType(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#161616] text-[#909090] border border-[#222222] rounded py-1 px-2.5 text-xs focus:outline-none focus:border-[#404040]"
            >
              <option value="all">All Types</option>
              <option value="GOAL_NOT_SUBMITTED">Goals Not Submitted</option>
              <option value="GOAL_NOT_APPROVED">Approval Overdue</option>
              <option value="CHECKIN_MISSED">Check-in Missed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-[#555555] bg-[#0d0d0d] border-b border-[#222222]">
                <th className="py-2.5 px-4 text-left font-semibold text-[10px]">Employee</th>
                <th className="py-2.5 px-4 text-left font-semibold text-[10px]">Rule</th>
                <th className="py-2.5 px-4 text-left font-semibold text-[10px]">Level</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Triggered</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Days Open</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Status</th>
                <th className="py-2.5 px-4 text-center font-semibold text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-[#555555] italic bg-[#111111]">
                    {logs.length === 0
                      ? "No escalations found."
                      : "No escalations match the selected filters."}
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => {
                  const resolved = log.resolved_at !== null;
                  const daysOpen = getDaysOpen(log.triggered_at, log.resolved_at);

                  return (
                    <tr
                      key={log.id}
                      className={`text-xs border-b border-[#222222]/40 transition-colors hover:bg-[#141414] ${
                        idx % 2 === 0 ? "bg-[#111111]" : "bg-[#0f0f0f]"
                      }`}
                    >
                      {/* Employee Cell */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-center text-[10px] font-semibold text-zinc-100 flex-shrink-0">
                            {initials(log.employee_name)}
                          </div>
                          <div>
                            <div className="text-[#ccc] font-medium">{log.employee_name}</div>
                            <div className="text-[10px] text-[#555555] mt-0.5">{log.employee_email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rule Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`badge text-[9px] ${
                            log.rule_type === "GOAL_NOT_SUBMITTED"
                              ? "bg-[#5a4a1a] text-[#c49a2a]"
                              : log.rule_type === "GOAL_NOT_APPROVED"
                              ? "bg-[#1a2a4a] text-[#4a7ac4]"
                              : "bg-[#5a1a1a] text-[#c44a4a]"
                          }`}
                        >
                          {getRuleLabel(log.rule_type)}
                        </span>
                      </td>

                      {/* Level Cell */}
                      <td className="py-3 px-4">
                        <span
                          className={`badge text-[9px] ${
                            log.level === "EMPLOYEE"
                              ? "bg-[#1e1e1e] text-[#666666]"
                              : log.level === "MANAGER"
                              ? "bg-[#5a4a1a] text-[#c49a2a]"
                              : "bg-[#5a1a1a] text-[#c44a4a]"
                          }`}
                        >
                          {log.level === "HR" ? "HR / Admin" : log.level}
                        </span>
                      </td>

                      {/* Triggered date */}
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-[#666666]">
                        {formatDate(log.triggered_at)}
                      </td>

                      {/* Days Open */}
                      <td
                        className={`py-3 px-4 text-center font-mono text-[11px] font-bold ${getDaysOpenColor(
                          daysOpen,
                          resolved
                        )}`}
                      >
                        {resolved ? "Resolved" : `${daysOpen} days`}
                      </td>

                      {/* Status badge */}
                      <td className="py-3 px-4 text-center">
                        {resolved ? (
                          <div className="flex flex-col items-center">
                            <span className="badge bg-[#2d5a3d] text-[#4d9966] text-[9px]">Resolved</span>
                            <span className="text-[9px] text-[#555555] mt-0.5">
                              {formatDate(log.resolved_at).split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="badge bg-[#5a4a1a] text-[#c49a2a] text-[9px]">Open</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        {resolved ? (
                          <span className="text-[11px] text-[#555555] italic truncate max-w-[150px] block" title={log.notes}>
                            {log.notes?.includes("Resolved notes:")
                              ? log.notes.split("Resolved notes:")[1].trim()
                              : log.notes || "—"}
                          </span>
                        ) : resolvingLogId === log.id ? (
                          <div className="flex flex-col gap-1.5 p-1 border border-[#222222] bg-[#161616] rounded max-w-[200px] mx-auto">
                            <textarea
                              placeholder="Resolution details..."
                              value={resolveNotes}
                              onChange={(e) => setResolveNotes(e.target.value)}
                              className="w-full bg-[#111] text-xs text-[#ccc] border border-[#222] rounded p-1.5 focus:outline-none focus:border-[#444] resize-none h-12"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setResolvingLogId(null)}
                                className="text-[10px] text-[#555] hover:text-[#777]"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleResolve(log.id)}
                                className="text-[10px] font-semibold text-[#4d9966] hover:underline"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setResolvingLogId(log.id);
                              setResolveNotes("");
                            }}
                            className="text-xs text-[#c49a2a] hover:underline hover:text-[#e8b53c]"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#111111] border-t border-[#222222] flex items-center justify-between text-xs">
            <span className="text-[#555555]">
              Page {currentPage} of {totalPages} ({filteredLogs.length} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn text-xs py-1 px-3 disabled:opacity-30"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn text-xs py-1 px-3 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4 — Escalation Flow diagram */}
      <section className="aq-card p-5 border border-[#222222] overflow-hidden">
        <button
          onClick={() => setFlowExpanded((prev) => !prev)}
          className="w-full flex items-center justify-between text-[#f5f5f5]"
        >
          <div className="text-left">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em]">
              How Escalation Works
            </h3>
            <p className="text-[11px] text-[#555555] mt-1">
              Understand the rule-based hierarchy levels.
            </p>
          </div>
          {flowExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {flowExpanded && (
          <div className="mt-6 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 xl:gap-2 border-t border-[#1a1a1a] pt-6 animate-slideDown">
            {/* Step 1 */}
            <div className="flex-1 p-4 bg-[#161616] border border-[#222222] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[10px] font-bold text-[#666666]">
                  1
                </span>
                <span className="text-[12px] font-semibold text-[#f0f0f0]">Initial Period</span>
              </div>
              <p className="text-[10px] text-[#555555] mt-2.5 leading-relaxed">
                Action must be completed within the threshold days limit. No alert triggers.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden xl:flex items-center text-[#222] text-lg font-bold">→</div>

            {/* Step 2 */}
            <div className="flex-1 p-4 bg-[#161616] border border-[#222222] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#5a4a1a] flex items-center justify-center text-[10px] font-bold text-[#c49a2a]">
                  2
                </span>
                <span className="text-[12px] font-semibold text-[#c49a2a]">Level 1 — Employee</span>
              </div>
              <p className="text-[10px] text-[#555555] mt-2.5 leading-relaxed">
                System marks action as overdue. Employee is notified to perform immediate action.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden xl:flex items-center text-[#222] text-lg font-bold">→</div>

            {/* Step 3 */}
            <div className="flex-1 p-4 bg-[#161616] border border-[#222222] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#5a1a1a] flex items-center justify-center text-[10px] font-bold text-[#c44a4a]">
                  3
                </span>
                <span className="text-[12px] font-semibold text-[#c44a4a]">Level 2 — Manager</span>
              </div>
              <p className="text-[10px] text-[#555555] mt-2.5 leading-relaxed">
                Action open for {`> 2× threshold`}. Reporting manager is looped in for coaching.
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden xl:flex items-center text-[#222] text-lg font-bold">→</div>

            {/* Step 4 */}
            <div className="flex-1 p-4 bg-[#161616] border border-[#222222] rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#3a1a1a] flex items-center justify-center text-[10px] font-bold text-[#e55353]">
                  4
                </span>
                <span className="text-[12px] font-semibold text-[#e55353]">Level 3 — HR / Admin</span>
              </div>
              <p className="text-[10px] text-[#555555] mt-2.5 leading-relaxed">
                Action open for {`> 3× threshold`}. HR Department is briefed for direct intervention.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-[90px]" />
        ))}
      </div>
      <div className="skeleton h-[280px]" />
      <div className="skeleton h-[350px]" />
      <div className="skeleton h-[90px]" />
    </div>
  );
}
