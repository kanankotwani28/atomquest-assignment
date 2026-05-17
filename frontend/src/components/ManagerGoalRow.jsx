import { useState } from 'react';
import { managerEditGoal } from '../api/manager';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  DRAFT:     'bg-gray-100 text-gray-500',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-green-100 text-green-700',
  RETURNED:  'bg-red-100 text-red-600',
};

const UOM_LABELS = {
  NUMERIC_MIN: 'Higher is better',
  NUMERIC_MAX: 'Lower is better',
  TIMELINE:    'Timeline',
  ZERO:        'Zero = Success',
};

export default function ManagerGoalRow({ goal, onUpdated, onReturn }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields]   = useState({ target: goal.target, weightage: goal.weightage });
  const [saving, setSaving]   = useState(false);

  const canEdit = goal.status === 'SUBMITTED';

  const saveEdit = async () => {
    setSaving(true);
    try {
      await managerEditGoal(goal.id, fields);
      toast.success('Goal updated');
      setEditing(false);
      onUpdated(); // re-fetch team goals
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      editing ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-200 bg-white'
    }`}>
      {/* Top row: title + status + actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{goal.title}</p>
          <p className="text-xs text-indigo-600 mt-0.5">{goal.thrustArea?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLES[goal.status]}`}>
            {goal.status}
          </span>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg
                         text-gray-600 hover:bg-gray-50 transition-colors">
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Metrics — editable when in edit mode */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">UoM type</p>
          <p className="text-xs text-gray-700">{UOM_LABELS[goal.uomType]}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Target</p>
          {editing ? (
            <input
              type="number"
              value={fields.target}
              onChange={e => setFields({ ...fields, target: e.target.value })}
              className="w-full px-2 py-1 border border-indigo-300 rounded-md text-xs
                         focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <p className="text-xs text-gray-700">
              {goal.uomType === 'ZERO' ? '0' : goal.target.toLocaleString()}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">Weightage (%)</p>
          {editing ? (
            <input
              type="number"
              min="10"
              max="100"
              value={fields.weightage}
              onChange={e => setFields({ ...fields, weightage: e.target.value })}
              className="w-full px-2 py-1 border border-indigo-300 rounded-md text-xs
                         focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <p className="text-xs text-gray-700">{goal.weightage}%</p>
          )}
        </div>
      </div>

      {/* Edit action bar */}
      {editing && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-indigo-100">
          <button onClick={saveEdit} disabled={saving}
            className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button onClick={() => { setEditing(false); setFields({ target: goal.target, weightage: goal.weightage }); }}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg
                       text-gray-500 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Return button for submitted goals */}
      {canEdit && !editing && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button onClick={() => onReturn(goal)}
            className="text-xs text-red-500 hover:text-red-700 transition-colors">
            Return for rework →
          </button>
        </div>
      )}
    </div>
  );
}