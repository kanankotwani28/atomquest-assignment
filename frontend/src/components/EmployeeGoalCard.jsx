import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ManagerGoalRow from "./ManagerGoalRow";

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "E";
}

export default function EmployeeGoalCard({
  employee,
  goals,
  totalWeightage,
  submittedCount,
  approvedCount,
  revisionCount = 0,
  onApprove,
  onUpdated,
  onReturn,
}) {
  const [expanded, setExpanded] = useState(submittedCount > 0 || revisionCount > 0);
  const allApproved = approvedCount === goals.length && goals.length > 0;
  const canApproveAll = submittedCount > 0 && Math.round(totalWeightage) === 100;

  return (
    <div className="aq-card p-0 overflow-hidden">
      {/* Accordion header trigger */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#161616]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-[#222222] flex items-center justify-center text-xs font-semibold text-[#e8e8e8] flex-shrink-0">
            {initials(employee.name)}
          </div>
          <div>
            <p className="text-xs font-medium text-[#f5f5f5]">{employee.name}</p>
            <p className="text-[11px] text-[#555555]">{employee.department || "General"}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden gap-2 text-xs sm:flex">
            {submittedCount > 0 && <span className="status-badge status-submitted">{submittedCount} pending</span>}
            {approvedCount > 0 && <span className="status-badge status-approved">{approvedCount} approved</span>}
            {revisionCount > 0 && <span className="status-badge status-revision-required">{revisionCount} revision</span>}
            {goals.length === 0 && <span className="status-badge status-draft">No goals</span>}
          </div>
          <span className={`mono text-xs ${Math.round(totalWeightage) === 100 ? "text-[#4d9966]" : "text-[#909090]"}`}>
            {totalWeightage.toFixed(0)}%
          </span>
          <span className="text-[#555555]">
            {expanded ? <ChevronUp size={15} strokeWidth={1.5} /> : <ChevronDown size={15} strokeWidth={1.5} />}
          </span>
        </div>
      </button>

      {/* Accordion content body */}
      {expanded && (
        <div className="border-t border-[#222222] p-5 bg-[#0e0e0e]/40">
          {goals.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#555555]">No goals submitted yet for this cycle</p>
          ) : (
            <>
              {/* Employee detail card */}
              <div className="bg-[#111111] border border-[#222222] rounded-lg p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="label block mb-1 text-[#555555]">Employee Profile</span>
                  <h4 className="text-xs font-medium text-[#f5f5f5]">{employee.name}</h4>
                  <p className="text-[11px] text-[#909090] mt-0.5">{employee.email}</p>
                </div>
                <div className="flex gap-4 sm:text-right flex-row sm:items-center">
                  <div>
                    <span className="label block mb-1 text-[#555555]">Department</span>
                    <span className="text-xs text-[#909090] bg-[#161616] border border-[#222222] px-2.5 py-1 rounded">
                      {employee.department || "General"}
                    </span>
                  </div>
                  <div>
                    <span className="label block mb-1 text-[#555555]">Role</span>
                    <span className="text-xs text-[#909090] bg-[#161616] border border-[#222222] px-2.5 py-1 rounded">
                      {employee.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Goal table list */}
              <div className="overflow-x-auto">
                <table className="aq-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left py-2 font-semibold">Goal Title</th>
                      <th className="text-left py-2 font-semibold">Thrust Area</th>
                      <th className="text-left py-2 font-semibold">UoM</th>
                      <th className="text-left py-2 font-semibold">Target</th>
                      <th className="text-left py-2 font-semibold">Weightage</th>
                      <th className="text-left py-2 font-semibold">Status</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((goal) => (
                      <ManagerGoalRow key={goal.id || goal._id} goal={goal} onUpdated={onUpdated} onReturn={onReturn} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Status Notice or Approve actions bar */}
              {!allApproved && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#222222] pt-4">
                  <div>
                    {!canApproveAll && submittedCount > 0 && (
                      <p className="text-xs text-[#c49a2a]">
                        Total weightage is {totalWeightage.toFixed(1)}%; must be exactly 100% to enable approval.
                      </p>
                    )}
                    {revisionCount > 0 && submittedCount === 0 && (
                      <p className="text-xs text-[#c49a2a]">
                        Waiting for employee to rebalance and resubmit after shared KPI assignment.
                      </p>
                    )}
                    {canApproveAll && <p className="text-xs text-[#4d9966]">All goals valid and ready to approve.</p>}
                  </div>
                  <button
                    onClick={() => onApprove(employee.id)}
                    disabled={!canApproveAll}
                    className="btn btn-confirm sm:ml-auto w-full sm:w-auto"
                  >
                    Approve All
                  </button>
                </div>
              )}

              {allApproved && (
                <div className="mt-4 border-t border-[#222222] pt-4">
                  <p className="text-xs text-[#4d9966]">All goals approved and locked.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
