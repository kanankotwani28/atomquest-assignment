import { useState } from "react";
import { upsertCheckIn } from "../api/checkins";
import ScoreBadge from "./ScoreBadge";
import toast from "react-hot-toast";

const PROGRESS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started" },
  { value: "ON_TRACK", label: "On track" },
  { value: "COMPLETED", label: "Completed" },
];

const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  TIMELINE: "Completion date",
  ZERO: "Zero = Success",
};

export default function CheckInForm({ goal, quarter, existingCheckIn, onSaved, canEdit = true }) {
  const [actual, setActual] = useState(existingCheckIn?.actual ?? existingCheckIn?.actual ?? "");
  const [completionDate, setCompletionDate] = useState(
    existingCheckIn?.completionDate || existingCheckIn?.completion_date
      ? new Date(existingCheckIn?.completionDate || existingCheckIn?.completion_date).toISOString().split("T")[0]
      : "",
  );
  const [progressStatus, setProgressStatus] = useState(
    existingCheckIn?.progressStatus || existingCheckIn?.progress_status || "NOT_STARTED",
  );
  const [saving, setSaving] = useState(false);

  const uom = goal.uomType || goal.uom_type;
  const previewScore = () => {
    if (uom === "ZERO") return actual === "" ? null : parseFloat(actual) === 0 ? 100 : 0;
    if (uom === "NUMERIC_MIN") {
      if (!actual || !goal.target) return null;
      return parseFloat(((parseFloat(actual) / goal.target) * 100).toFixed(2));
    }
    if (uom === "NUMERIC_MAX") {
      if (!actual || parseFloat(actual) === 0) return null;
      return parseFloat(((goal.target / parseFloat(actual)) * 100).toFixed(2));
    }
    if (uom === "TIMELINE") {
      if (!completionDate) return null;
      const deadline = new Date(goal.target);
      const completed = new Date(completionDate);
      if (completed <= deadline) return 100;
      const daysLate = (completed - deadline) / (1000 * 60 * 60 * 24);
      return parseFloat(Math.max(0, 100 - daysLate * 5).toFixed(2));
    }
    return null;
  };

  const handleSave = async () => {
    if (!canEdit) return;

    const payload = {
      goal_id: goal.id,
      quarter,
      actual: uom !== "TIMELINE" ? (actual === "" ? undefined : parseFloat(actual)) : undefined,
      completion_date: uom === "TIMELINE" && completionDate ? new Date(completionDate).toISOString() : undefined,
      progress_status: progressStatus,
    };

    setSaving(true);
    try {
      await upsertCheckIn(payload);
      toast.success(`${quarter} check-in saved`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const liveScore = previewScore();
  const isTimeline = goal.uomType === "TIMELINE";
  const scorePct = liveScore ?? existingCheckIn?.score ?? 0;
  const fillClass = scorePct >= 80 ? "fill-success" : scorePct >= 50 ? "fill-warning" : "fill-danger";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="progress-track flex-1">
          <div className={`progress-fill ${fillClass}`} style={{ width: `${Math.min(scorePct, 100)}%` }} />
        </div>
        <span className="mono w-16 text-right text-xs text-[#f0f0f0]">{scorePct.toFixed(1)}%</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#888]">
            {isTimeline ? "Completion date" : "Actual achievement"}
          </label>
          {isTimeline ? (
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 text-sm disabled:text-[#555]"
            />
          ) : (
            <input
              type="number"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              disabled={!canEdit}
              placeholder={goal.uomType === "ZERO" ? "0" : "Enter actual value"}
              className="w-full px-3 py-2 text-sm disabled:text-[#555]"
            />
          )}
          <p className="mt-1 text-xs text-[#555]">
            {UOM_LABELS[goal.uomType]} · Target: {goal.uomType === "ZERO" ? "0" : goal.target.toLocaleString()}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#888]">Progress status</label>
          <select
            value={progressStatus}
            onChange={(e) => setProgressStatus(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 text-sm disabled:text-[#555]"
          >
            {PROGRESS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {liveScore !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2">
          <span className="text-xs text-[#888]">Live score preview</span>
          <ScoreBadge score={liveScore} />
        </div>
      )}

      {existingCheckIn?.managerComment && (
        <blockquote className="border-l-[3px] border-[#333] bg-[#0f0f0f] px-3 py-2 text-xs text-[#888]">
          <p className="mb-1 text-[#f0f0f0]">Manager comment</p>
          {existingCheckIn.managerComment}
        </blockquote>
      )}

      <button
        onClick={handleSave}
        disabled={!canEdit || saving || (!actual && !completionDate)}
        className="btn btn-success w-full"
      >
        {!canEdit ? "Check-in window closed" : saving ? "Saving..." : existingCheckIn ? "Update check-in" : "Save check-in"}
      </button>
    </div>
  );
}
