import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ManagerGoalRow from "./ManagerGoalRow";

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "E";
}

export default function EmployeeGoalCard({
  employee, goals, totalWeightage,
  submittedCount, approvedCount, revisionCount = 0,
  onApprove, onUpdated, onReturn,
}) {
  const [expanded, setExpanded] = useState(submittedCount > 0 || revisionCount > 0);
  const allApproved = approvedCount === goals.length && goals.length > 0;
  const canApproveAll = submittedCount > 0 && Math.round(totalWeightage) === 100;

  return (
    <div className="admin-glass" style={{ padding: 0, overflow: "hidden" }}>
      <button type="button"
        style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", transition: "background 150ms ease" }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.02)"}
        onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #4F46E5, #6366F1)",
            color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 600, display: "grid", placeItems: "center",
            flexShrink: 0, border: "1px solid rgba(99,102,241,0.25)"
          }}>{initials(employee.name)}</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: "#fff" }}>{employee.name}</p>
            <p style={{ fontSize: 11, color: "#475569" }}>{employee.department || "General"}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {submittedCount > 0 && <span className="admin-badge admin-badge--submit">{submittedCount} pending</span>}
            {approvedCount > 0 && <span className="admin-badge admin-badge--approve">{approvedCount} approved</span>}
            {revisionCount > 0 && <span className="admin-badge admin-badge--submit">{revisionCount} revision</span>}
            {goals.length === 0 && <span className="admin-badge admin-badge--draft">No goals</span>}
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: Math.round(totalWeightage) === 100 ? "#10B981" : "#64748B" }}>
            {totalWeightage.toFixed(0)}%
          </span>
          <span style={{ color: "#334155" }}>
            {expanded ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
          </span>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 18px", background: "rgba(8,20,47,0.50)", display: "flex", flexDirection: "column", gap: 14 }}>
          {goals.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 11, color: "#475569", padding: "16px 0" }}>No goals submitted yet for this cycle</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, padding: 12, background: "rgba(8,20,47,0.80)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <span className="admin-label" style={{ display: "block", marginBottom: 3 }}>Employee</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>{employee.name}</span>
                  <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{employee.email}</p>
                </div>
                <div>
                  <span className="admin-label" style={{ display: "block", marginBottom: 3 }}>Department</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{employee.department || "General"}</span>
                </div>
                <div>
                  <span className="admin-label" style={{ display: "block", marginBottom: 3 }}>Role</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{employee.role}</span>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["Goal Title","Thrust Area","UoM","Target","Weight","Status",""].map((h) => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((goal) => (
                      <ManagerGoalRow key={goal.id || goal._id} goal={goal} onUpdated={onUpdated} onReturn={onReturn} />
                    ))}
                  </tbody>
                </table>
              </div>

              {!allApproved && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    {!canApproveAll && submittedCount > 0 && (
                      <p style={{ fontSize: 11, color: "#F59E0B" }}>Total weightage is {totalWeightage.toFixed(1)}%; must be exactly 100% to enable approval.</p>
                    )}
                    {revisionCount > 0 && submittedCount === 0 && (
                      <p style={{ fontSize: 11, color: "#F59E0B" }}>Waiting for employee to rebalance and resubmit after shared KPI assignment.</p>
                    )}
                    {canApproveAll && <p style={{ fontSize: 11, color: "#10B981" }}>All goals valid and ready to approve.</p>}
                  </div>
                  <button onClick={() => onApprove(employee.id)} disabled={!canApproveAll} className="admin-btn admin-btn--primary">
                    Approve All
                  </button>
                </div>
              )}

              {allApproved && (
                <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <p style={{ fontSize: 11, color: "#10B981" }}>All goals approved and locked.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
