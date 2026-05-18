import { useState, useRef, useCallback } from "react";
import { managerEditGoal } from "../api/manager";
import toast from "react-hot-toast";

const formatTargetValue = (target, uom) => {
  if (uom === "ZERO") return "0";
  if (uom === "TIMELINE") {
    if (!target) return "—";
    try { return new Date(target).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return target?.toLocaleString() ?? "—"; }
  }
  return target !== undefined ? target.toLocaleString() : "—";
};

const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  PERCENTAGE:  "Percentage",
  TIMELINE:    "Timeline",
  ZERO:        "Zero = Success",
};

const STATUS_BADGE = {
  APPROVED:          "admin-badge admin-badge--approve",
  SUBMITTED:         "admin-badge admin-badge--submit",
  REVISION_REQUIRED: "admin-badge admin-badge--submit",
  RETURNED:          "admin-badge admin-badge--return",
  DRAFT:             "admin-badge admin-badge--draft",
};

/**
 * Debounce helper — returns a ref-based debounced function.
 * Delays invocation by `delay` ms after the last call.
 */
function useDebouncedCallback(fn, delay = 300) {
  const timerRef = useRef(null);
  return useCallback((...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function ManagerGoalRow({ goal, onUpdated, onReturn }) {
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
    } finally {
      setSaving(false);
    }
  };

  // Debounced blur handlers — prevent rapid API calls
  const debouncedSaveTarget = useDebouncedCallback(async (val) => {
    if (isNaN(val) || val === goal.target) return;
    await saveEdit({ target: val });
  }, 200);

  const debouncedSaveWeightage = useDebouncedCallback(async (val) => {
    if (isNaN(val) || val < 10 || val > 100 || val === goal.weightage) {
      if (val < 10 || val > 100) toast.error("Weightage must be between 10% and 100%");
      return;
    }
    await saveEdit({ weightage: val });
  }, 200);

  const handleBlurTarget = (e) => {
    const val = parseFloat(e.target.value);
    debouncedSaveTarget(val);
  };

  const handleBlurWeightage = (e) => {
    const val = parseFloat(e.target.value);
    debouncedSaveWeightage(val);
  };

  return (
    <tr id={`goal-${goal.id || goal._id}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
      <td style={{ padding: "10px 12px" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#fff", maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</span>
      </td>
      <td style={{ padding: "10px 12px" }}><span style={{ fontSize: 11, color: "#64748B" }}>{goal.thrustArea?.name || goal.thrust_area?.name}</span></td>
      <td style={{ padding: "10px 12px" }}><span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#64748B" }}>{UOM_LABELS[goal.uomType || goal.uom_type]}</span></td>
      <td style={{ padding: "10px 12px" }}>
        {canEdit ? (
          <input type="number" step="any" defaultValue={goal.target} onBlur={handleBlurTarget} disabled={saving}
            style={{ width: 80, padding: "3px 6px", background: "transparent", border: "1px solid transparent", borderRadius: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#fff", outline: "none" }}
            onFocus={(e) => e.target.style.borderColor = "rgba(99,102,241,0.3)"}
          />
        ) : (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#94A3B8" }}>{formatTargetValue(goal.target, goal.uomType || goal.uom_type)}</span>
        )}
      </td>
      <td style={{ padding: "10px 12px" }}>
        {canEdit ? (
          <input type="number" min="10" max="100" defaultValue={goal.weightage} onBlur={handleBlurWeightage} disabled={saving}
            style={{ width: 64, padding: "3px 6px", background: "transparent", border: "1px solid transparent", borderRadius: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#fff", outline: "none" }}
            onFocus={(e) => e.target.style.borderColor = "rgba(99,102,241,0.3)"}
          />
        ) : (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#94A3B8" }}>{goal.weightage}%</span>
        )}
      </td>
      <td style={{ padding: "10px 12px" }}><span className={`admin-badge ${STATUS_BADGE[goal.status] || "admin-badge--draft"}`}>{goal.status}</span></td>
      <td style={{ padding: "10px 12px", textAlign: "right" }}>
        {canEdit && (
          <button onClick={() => onReturn(goal)} style={{ fontSize: 11, fontWeight: 500, color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>
            Return
          </button>
        )}
      </td>
    </tr>
  );
}
