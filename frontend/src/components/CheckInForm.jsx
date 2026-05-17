import { useState } from "react";
import { upsertCheckIn } from "../api/checkins";
import ScoreBadge from "./ScoreBadge";
import toast from "react-hot-toast";

const PROGRESS_OPTIONS = [
  { value: "NOT_STARTED", label: "Not started", color: "text-gray-500" },
  { value: "ON_TRACK", label: "On track", color: "text-blue-600" },
  { value: "COMPLETED", label: "Completed", color: "text-green-600" },
];

const UOM_LABELS = {
  NUMERIC_MIN: "Higher is better",
  NUMERIC_MAX: "Lower is better",
  TIMELINE: "Completion date",
  ZERO: "Zero = Success",
};

export default function CheckInForm({
  goal,
  quarter,
  existingCheckIn,
  onSaved,
  canEdit = true,
}) {
  const [actual, setActual] = useState(
    existingCheckIn?.actual ?? existingCheckIn?.actual ?? "",
  );
  const [completionDate, setCompletionDate] = useState(
    existingCheckIn?.completionDate || existingCheckIn?.completion_date
      ? new Date(
          existingCheckIn?.completionDate || existingCheckIn?.completion_date,
        )
          .toISOString()
          .split("T")[0]
      : "",
  );
  const [progressStatus, setProgressStatus] = useState(
    existingCheckIn?.progressStatus ||
      existingCheckIn?.progress_status ||
      "NOT_STARTED",
  );
  const [saving, setSaving] = useState(false);

  // Live score preview — recalculates client-side as user types
  // so they see immediate feedback before saving
  const uom = goal.uomType || goal.uom_type;
  const previewScore = () => {
    if (uom === "ZERO") {
      return actual === "" ? null : parseFloat(actual) === 0 ? 100 : 0;
    }
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
      actual:
        uom !== "TIMELINE"
          ? actual === ""
            ? undefined
            : parseFloat(actual)
          : undefined,
      completion_date:
        uom === "TIMELINE" && completionDate
          ? new Date(completionDate).toISOString()
          : undefined,
      progress_status: progressStatus,
    };

    console.log("Employee check-in save payload:", payload);

    setSaving(true);
    try {
      const res = await upsertCheckIn(payload);
      console.log("Employee check-in save response:", res.data);
      toast.success(`${quarter} check-in saved`);
      onSaved();
    } catch (err) {
      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  const liveScore = previewScore();
  const isTimeline = goal.uomType === "TIMELINE";

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
      {/* Goal context */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {quarter} Check-in
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {goal.title}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {UOM_LABELS[goal.uomType]} · Target:{" "}
            {goal.uomType === "ZERO" ? "0" : goal.target.toLocaleString()}
          </p>
        </div>
        {existingCheckIn?.score !== undefined && (
          <ScoreBadge score={existingCheckIn.score} />
        )}
      </div>

      {/* Actual / date input */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {isTimeline ? "Completion date" : "Actual achievement"}
          </label>
          {isTimeline ? (
            <input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400
                         disabled:bg-gray-100 disabled:text-gray-400"
            />
          ) : (
            <input
              type="number"
              step="any"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              disabled={!canEdit}
              placeholder={goal.uomType === "ZERO" ? "0" : "Enter actual value"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400
                         disabled:bg-gray-100 disabled:text-gray-400"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Progress status
          </label>
          <select
            value={progressStatus}
            onChange={(e) => setProgressStatus(e.target.value)}
            disabled={!canEdit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                       bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400
                       disabled:bg-gray-100 disabled:text-gray-400"
          >
            {PROGRESS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live score preview */}
      {liveScore !== null && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
          <span className="text-xs text-gray-500">Live score preview:</span>
          <ScoreBadge score={liveScore} />
          <span className="text-xs text-gray-400 ml-auto">
            {goal.uomType === "NUMERIC_MIN" &&
              `${actual} ÷ ${goal.target} × 100`}
            {goal.uomType === "NUMERIC_MAX" &&
              `${goal.target} ÷ ${actual} × 100`}
            {goal.uomType === "ZERO" &&
              (parseFloat(actual) === 0 ? "Zero achieved ✓" : "Non-zero value")}
            {goal.uomType === "TIMELINE" &&
              (liveScore === 100 ? "On or before deadline ✓" : "Past deadline")}
          </span>
        </div>
      )}

      {/* Manager comment (read-only for employee) */}
      {existingCheckIn?.managerComment && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <p className="text-xs font-medium text-amber-700 mb-1">
            Manager comment
          </p>
          <p className="text-xs text-amber-800">
            {existingCheckIn.managerComment}
          </p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!canEdit || saving || (!actual && !completionDate)}
        className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium
                   hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors"
      >
        {!canEdit
          ? "Check-in window closed"
          : saving
            ? "Saving..."
            : existingCheckIn
              ? "Update check-in"
              : "Save check-in"}
      </button>
    </div>
  );
}
