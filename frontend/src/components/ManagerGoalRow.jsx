import { useState } from "react";
import { managerEditGoal } from "../api/manager";
import toast from "react-hot-toast";

const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  TIMELINE: "Timeline",
  ZERO: "Zero = Success",
};

const statusClass = (status) => `status-${String(status || "DRAFT").toLowerCase().replaceAll("_", "-")}`;

export default function ManagerGoalRow({ goal, onUpdated, onReturn }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({ target: goal.target, weightage: goal.weightage });
  const [saving, setSaving] = useState(false);
  const canEdit = goal.status === "SUBMITTED";

  const saveEdit = async () => {
    setSaving(true);
    try {
      await managerEditGoal(goal.id, fields);
      toast.success("Goal updated");
      setEditing(false);
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="text-[#f0f0f0]">{goal.title}</td>
      <td>{goal.thrustArea?.name}</td>
      <td className="mono text-xs">{UOM_LABELS[goal.uomType]}</td>
      <td>
        {editing ? (
          <input
            type="number"
            value={fields.target}
            onChange={(e) => setFields({ ...fields, target: e.target.value })}
            className="w-28 px-2 py-1 text-xs"
          />
        ) : (
          <span className="mono text-xs">{goal.uomType === "ZERO" ? "0" : goal.target.toLocaleString()}</span>
        )}
      </td>
      <td>
        {editing ? (
          <input
            type="number"
            min="10"
            max="100"
            value={fields.weightage}
            onChange={(e) => setFields({ ...fields, weightage: e.target.value })}
            className="w-20 px-2 py-1 text-xs"
          />
        ) : (
          <span className="mono text-xs">{goal.weightage}%</span>
        )}
      </td>
      <td>
        <span className={`status-badge ${statusClass(goal.status)}`}>{goal.status}</span>
      </td>
      <td className="text-right">
        {canEdit && !editing && (
          <div className="flex justify-end gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-[#888] hover:text-[#f0f0f0]">
              Edit
            </button>
            <button onClick={() => onReturn(goal)} className="btn-text-danger text-xs">
              Return
            </button>
          </div>
        )}
        {editing && (
          <div className="flex justify-end gap-2">
            <button onClick={saveEdit} disabled={saving} className="btn btn-success min-h-0 px-3 py-1 text-xs">
              {saving ? "Saving" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setFields({ target: goal.target, weightage: goal.weightage });
              }}
              className="btn min-h-0 px-3 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
