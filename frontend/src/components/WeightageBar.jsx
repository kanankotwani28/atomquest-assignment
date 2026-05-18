export default function WeightageBar({ goals }) {
  const total = goals.reduce((sum, g) => sum + g.weightage, 0);
  const remaining = Math.max(0, 100 - total);

  // Bar color follows progress bar rules:
  // 100% exactly:   fill #4d9966 (excellent)
  // > 100%:         fill #c44a4a (poor)
  // 75-99%:         fill #4a7ac4 (good)
  // 50-74%:         fill #c49a2a (warn)
  // < 50%:          fill #c44a4a (poor)
  const getFillClass = (t) => {
    if (Math.round(t) === 100) return "excellent";
    if (t > 100) return "poor";
    if (t >= 75) return "good";
    if (t >= 50) return "warn";
    return "poor";
  };

  const fillClass = getFillClass(total);

  return (
    <div className="aq-card">
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="progress-track thick">
            <div
              className={`progress-fill ${fillClass}`}
              style={{ width: `${Math.min(total, 100)}%` }}
            />
          </div>
        </div>
        <div className="number-medium flex-shrink-0">
          {total.toFixed(1)}% / 100%
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="micro">
          {goals.length} of 8 goals · {total > 100 ? `Exceeds by ${(total - 100).toFixed(1)}%` : `${remaining.toFixed(1)}% remaining`}
        </span>
      </div>
    </div>
  );
}
