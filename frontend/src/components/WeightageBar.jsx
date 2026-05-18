export default function WeightageBar({ goals }) {
  const total     = goals.reduce((sum, g) => sum + g.weightage, 0);
  const remaining = Math.max(0, 100 - total);

  const getFillClass = (t) => {
    if (Math.round(t) === 100) return "#10B981";
    if (t > 100) return "#EF4444";
    if (t >= 75) return "#818CF8";
    if (t >= 50) return "#F59E0B";
    return "#EF4444";
  };

  const fillColor = getFillClass(total);
  const pct = Math.min(total, 100);

  return (
    <div className="admin-glass" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${fillColor}, ${fillColor}CC)`, width: `${pct}%`, transition: "width 500ms ease" }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: Math.round(total) === 100 ? "#10B981" : total > 100 ? "#EF4444" : "#fff", letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>
          {total.toFixed(1)}%
        </span>
      </div>
      <p style={{ fontSize: 11, color: "#64748B" }}>
        {goals.length} of 8 goals ·{" "}
        {total > 100
          ? `Exceeds by ${(total - 100).toFixed(1)}%`
          : `${remaining.toFixed(1)}% remaining`}
      </p>
    </div>
  );
}