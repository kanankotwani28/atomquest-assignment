import { useState } from "react";
import { managerEditGoal } from "../api/manager";
import toast from "react-hot-toast";

const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  TIMELINE: "Timeline",
  ZERO: "Zero = Success",
};

const statusClass = (status) => `status-badge ${String(status || "DRAFT").toLowerCase().replaceAll("_", "-")}`;

export default function ManagerGoalRow({ goal, onUpdated, onReturn }) {
  const [fields, setFields] = useState({
    target: goal.target,
    weightage: goal.weightage
  });
  const [saving, setSaving] = useState(false);
  const canEdit = goal.status === "SUBMITTED";

  const saveEdit = async (updatedFields) => {
    setSaving(true);
    try {
      await managerEditGoal(goal.id || goal._id, updatedFields);
      toast.success("Goal updated");
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
      // Reset fields on error
      setFields({ target: goal.target, weightage: goal.weightage });
    } finally {
      setSaving(false);
    }
  };

  const handleBlurTarget = async (e) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val) || val === goal.target) return;
    const newFields = { ...fields, target: val };
    setFields(newFields);
    await saveEdit(newFields);
  };

  const handleBlurWeightage = async (e) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val) || val < 10 || val > 100 || val === goal.weightage) {
      if (val < 10 || val > 100) {
        toast.error("Weightage must be between 10% and 100%");
      }
      setFields({ ...fields, weightage: goal.weightage });
      return;
    }
    const newFields = { ...fields, weightage: val };
    setFields(newFields);
    await saveEdit(newFields);
  };

  return (
    <tr className="hover:bg-[#161616]/50 transition-colors">
      <td className="text-[#f5f5f5] font-medium text-xs max-w-[200px] truncate py-3">{goal.title}</td>
      <td className="text-xs text-[#909090] py-3">{goal.thrustArea?.name || goal.thrust_area?.name}</td>
      <td className="mono text-xs text-[#909090] py-3">{UOM_LABELS[goal.uomType || goal.uom_type]}</td>
      <td className="py-3">
        {canEdit ? (
          <input
            type="number"
            step="any"
            defaultValue={goal.target}
            onBlur={handleBlurTarget}
            disabled={saving}
            className="w-24 px-1.5 py-0.5 bg-transparent border border-transparent hover:border-[#222222] focus:border-[#404040] focus:bg-[#0a0a0a] rounded text-xs mono text-[#e8e8e8] transition-all focus:outline-none"
          />
        ) : (
          <span className="mono text-xs text-[#e8e8e8]">{goal.uomType === "ZERO" ? "0" : goal.target.toLocaleString()}</span>
        )}
      </td>
      <td className="py-3">
        {canEdit ? (
          <input
            type="number"
            min="10"
            max="100"
            defaultValue={goal.weightage}
            onBlur={handleBlurWeightage}
            disabled={saving}
            className="w-16 px-1.5 py-0.5 bg-transparent border border-transparent hover:border-[#222222] focus:border-[#404040] focus:bg-[#0a0a0a] rounded text-xs mono text-[#e8e8e8] transition-all focus:outline-none"
          />
        ) : (
          <span className="mono text-xs text-[#e8e8e8]">{goal.weightage}%</span>
        )}
      </td>
      <td className="py-3">
        <span className={statusClass(goal.status)}>{goal.status}</span>
      </td>
      <td className="text-right py-3 pr-4">
        {canEdit && (
          <button
            onClick={() => onReturn(goal)}
            className="text-xs font-medium text-[#c44a4a] hover:text-[#e55a5a] transition-colors"
          >
            Return
          </button>
        )}
      </td>
    </tr>
  );
}
