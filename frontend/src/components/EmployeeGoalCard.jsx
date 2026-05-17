import { useState } from 'react';
import ManagerGoalRow from './ManagerGoalRow';

export default function EmployeeGoalCard({
  employee, goals, totalWeightage,
  submittedCount, approvedCount,
  onApprove, onUpdated, onReturn
}) {
  const [expanded, setExpanded] = useState(submittedCount > 0); // auto-expand if action needed
  const allApproved   = approvedCount === goals.length && goals.length > 0;
  const canApproveAll = submittedCount > 0 && Math.round(totalWeightage) === 100;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Employee header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-indigo-600">
              {employee.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{employee.name}</p>
            <p className="text-xs text-gray-400">{employee.department}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Goal count badges */}
          <div className="flex gap-2 text-xs">
            {submittedCount > 0 && (
              <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                {submittedCount} pending
              </span>
            )}
            {approvedCount > 0 && (
              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                {approvedCount} approved
              </span>
            )}
            {goals.length === 0 && (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                No goals
              </span>
            )}
          </div>

          {/* Weightage total */}
          <span className={`text-xs font-medium ${
            Math.round(totalWeightage) === 100 ? 'text-green-600' : 'text-gray-400'
          }`}>
            {totalWeightage.toFixed(0)}%
          </span>

          <span className="text-gray-300 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded goal list */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-3">
          {goals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No goals submitted yet for this cycle
            </p>
          ) : (
            <>
              {goals.map(goal => (
                <ManagerGoalRow
                  key={goal.id}
                  goal={goal}
                  onUpdated={onUpdated}
                  onReturn={onReturn}
                />
              ))}

              {/* Approval action */}
              {!allApproved && (
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  {!canApproveAll && submittedCount > 0 && (
                    <p className="text-xs text-amber-600">
                      Total weightage is {totalWeightage.toFixed(1)}% — must be 100% to approve
                    </p>
                  )}
                  {canApproveAll && (
                    <p className="text-xs text-green-600">
                      ✓ All goals valid — ready to approve
                    </p>
                  )}
                  <button
                    onClick={() => onApprove(employee.id)}
                    disabled={!canApproveAll}
                    className="ml-auto text-sm px-4 py-2 bg-green-600 text-white rounded-lg
                               font-medium hover:bg-green-700 disabled:opacity-40
                               disabled:cursor-not-allowed transition-colors">
                    Approve all goals
                  </button>
                </div>
              )}

              {allApproved && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-green-600 font-medium">
                    ✓ All goals approved and locked
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}