// Why this component: visual feedback is critical for the weightage rule.
// Employees need to see in real time how much % they've used.
export default function WeightageBar({ goals }) {
  const total = goals.reduce((sum, g) => sum + g.weightage, 0);
  const remaining = 100 - total;
  const isComplete = Math.round(total) === 100;
  const isOver = total > 100;

  const barColor = isOver
    ? 'bg-red-500'
    : isComplete
    ? 'bg-green-500'
    : 'bg-indigo-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Total weightage</span>
        <span className={`text-sm font-semibold ${
          isOver ? 'text-red-600' : isComplete ? 'text-green-600' : 'text-gray-900'
        }`}>
          {total.toFixed(1)}% / 100%
        </span>
      </div>

      {/* Progress bar track */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">
          {goals.length} / 8 goals used
        </span>
        {isOver ? (
          <span className="text-xs text-red-600 font-medium">
            ⚠ Exceeds 100% by {(total - 100).toFixed(1)}%
          </span>
        ) : isComplete ? (
          <span className="text-xs text-green-600 font-medium">
            ✓ Ready to submit
          </span>
        ) : (
          <span className="text-xs text-gray-500">
            {remaining.toFixed(1)}% remaining
          </span>
        )}
      </div>
    </div>
  );
}