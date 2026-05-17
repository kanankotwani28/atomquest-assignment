// Visual feedback for the 100% weightage rule on employee goal sheets.
export default function WeightageBar({ goals }) {
  const total = goals.reduce((sum, g) => sum + g.weightage, 0);
  const remaining = 100 - total;
  const isComplete = Math.round(total) === 100;
  const isOver = total > 100;

  const fillClass = isOver
    ? "fill-danger"
    : isComplete
      ? "fill-success"
      : "fill-accent";

  return (
    <div className="aq-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="label">Total weightage</span>
        <span
          className={`mono text-sm ${
            isOver ? "text-[#c47a7a]" : isComplete ? "text-[#7ab88a]" : "text-[#f0f0f0]"
          }`}
        >
          {total.toFixed(1)}% / 100%
        </span>
      </div>

      <div className="progress-track">
        <div
          className={`progress-fill ${fillClass}`}
          style={{ width: `${Math.min(total, 100)}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#888]">{goals.length} / 8 goals used</span>
        {isOver ? (
          <span className="text-xs text-[#c47a7a]">
            Exceeds 100% by {(total - 100).toFixed(1)}%
          </span>
        ) : isComplete ? (
          <span className="text-xs text-[#7ab88a]">Ready to submit</span>
        ) : (
          <span className="text-xs text-[#888]">{remaining.toFixed(1)}% remaining</span>
        )}
      </div>
    </div>
  );
}
