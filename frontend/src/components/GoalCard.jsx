const STATUS_STYLES = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-green-100 text-green-700',
  RETURNED:  'bg-red-100 text-red-700',
  REVISION_REQUIRED: 'bg-orange-100 text-orange-700',
};

const UOM_LABELS = {
  NUMERIC_MIN: 'Higher is better',
  NUMERIC_MAX: 'Lower is better',
  TIMELINE:    'Timeline',
  ZERO:        'Zero = Success',
};

export default function GoalCard({ goal, onEdit, onDelete }) {
  const canEdit = ['DRAFT', 'RETURNED', 'REVISION_REQUIRED'].includes(goal.status) || goal.isShared;
  const canDelete = ['DRAFT', 'RETURNED'].includes(goal.status) && !goal.isShared;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-sm leading-snug">{goal.title}</h3>
          <p className="text-xs text-indigo-600 mt-0.5">{goal.thrustArea?.name}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_STYLES[goal.status]}`}>
          {goal.isShared && goal.status !== 'REVISION_REQUIRED' ? 'SHARED' : goal.status}
        </span>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{goal.description}</p>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-gray-100 mb-3">
        <div>
          <p className="text-xs text-gray-400">UoM</p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">{UOM_LABELS[goal.uomType]}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Target</p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">
            {goal.uomType === 'ZERO' ? '0 incidents' : goal.target.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Weightage</p>
          <p className="text-xs font-medium text-gray-700 mt-0.5">{goal.weightage}%</p>
        </div>
      </div>

      {/* Returned reason */}
      {goal.status === 'RETURNED' && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-red-600 font-medium">Returned by manager — please revise and resubmit</p>
        </div>
      )}

      {goal.isShared && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-indigo-700 font-medium">
            Shared KPI. Title and target are locked; only weightage can be adjusted.
          </p>
        </div>
      )}

      {goal.status === 'REVISION_REQUIRED' && (
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-orange-700 font-medium">
            Revision required. Rebalance weightage and submit for manager approval.
          </p>
        </div>
      )}

      {/* Actions */}
      {canEdit && (
        <div className="flex gap-2">
          <button onClick={() => onEdit(goal)}
            className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg
                       text-gray-600 hover:bg-gray-50 transition-colors">
            Edit
          </button>
          {canDelete && (
            <button onClick={() => onDelete(goal.id)}
              className="text-xs px-3 py-2 border border-red-200 rounded-lg
                         text-red-500 hover:bg-red-50 transition-colors">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
