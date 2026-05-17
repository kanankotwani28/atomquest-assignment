import { useState } from "react";
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
    <div className="aq-card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-[#161616]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="avatar">{initials(employee.name)}</div>
          <div>
            <p className="text-sm font-medium text-[#f0f0f0]">{employee.name}</p>
            <p className="text-xs text-[#555]">{employee.department}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden gap-2 text-xs sm:flex">
            {submittedCount > 0 && <span className="status-badge status-submitted">{submittedCount} pending</span>}
            {approvedCount > 0 && <span className="status-badge status-approved">{approvedCount} approved</span>}
            {revisionCount > 0 && <span className="status-badge status-revision-required">{revisionCount} revision</span>}
            {goals.length === 0 && <span className="status-badge status-draft">No goals</span>}
          </div>
          <span className={`mono text-xs ${Math.round(totalWeightage) === 100 ? "text-[#7ab88a]" : "text-[#888]"}`}>
            {totalWeightage.toFixed(0)}%
          </span>
          <span className="text-xs text-[#555]">{expanded ? "Collapse" : "Expand"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#2a2a2a] p-5">
          {goals.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#555]">No goals submitted yet for this cycle</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="aq-table">
                  <thead>
                    <tr>
                      <th>Goal Title</th>
                      <th>Thrust Area</th>
                      <th>UoM</th>
                      <th>Target</th>
                      <th>Weightage</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((goal) => (
                      <ManagerGoalRow key={goal.id} goal={goal} onUpdated={onUpdated} onReturn={onReturn} />
                    ))}
                  </tbody>
                </table>
              </div>

              {!allApproved && (
                <div className="mt-4 flex items-center justify-between border-t border-[#2a2a2a] pt-4">
                  {!canApproveAll && submittedCount > 0 && (
                    <p className="text-xs text-[#c09a4a]">
                      Total weightage is {totalWeightage.toFixed(1)}%; must be 100% to approve.
                    </p>
                  )}
                  {revisionCount > 0 && submittedCount === 0 && (
                    <p className="text-xs text-[#c09a4a]">
                      Waiting for employee to rebalance and resubmit after shared KPI assignment.
                    </p>
                  )}
                  {canApproveAll && <p className="text-xs text-[#7ab88a]">All goals valid and ready to approve.</p>}
                  <button onClick={() => onApprove(employee.id)} disabled={!canApproveAll} className="btn btn-success ml-auto">
                    Approve All
                  </button>
                </div>
              )}

              {allApproved && (
                <div className="mt-4 border-t border-[#2a2a2a] pt-4">
                  <p className="text-xs text-[#7ab88a]">All goals approved and locked.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
