export default function WeightageBar({ goals }) {
  const total     = goals.reduce((sum, g) => sum + g.weightage, 0);
  const remaining = Math.max(0, 100 - total);

  const getFillClass = (t) => {
    if (Math.round(t) === 100) return "excellent";
    if (t > 100) return "poor";
    if (t >= 75) return "good";
    if (t >= 50) return "warn";
    return "poor";
  };

  const fillClass = getFillClass(total);
  const pct = Math.min(total, 100);

  return (
    <div className="aq-card p-5">
      <div className="flex items-center justify-between gap-6 mb-3">
        <div className="flex-1">
          <div className="progress-track thick">
            <div className={`progress-fill ${fillClass}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="number-medium whitespace-nowrap" style={{ color: Math.round(total) === 100 ? "var(--score-excellent)" : total > 100 ? "var(--score-poor)" : "var(--text-primary)" }}>
          {total.toFixed(1)}%
        </p>
      </div>
      <p className="micro">
        {goals.length} of 8 goals ·{" "}
        {total > 100
          ? `Exceeds by ${(total - 100).toFixed(1)}%`
          : `${remaining.toFixed(1)}% remaining`}
      </p>
    </div>
  );
}