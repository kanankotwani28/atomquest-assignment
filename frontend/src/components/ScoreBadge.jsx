export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.05)", color: "#475569" }}>
        —
      </span>
    );
  }

  const val = parseFloat(score);
  const pct = val.toFixed(0);

  const getColor = (v) => v >= 80 ? "#10B981" : v >= 60 ? "#818CF8" : v >= 40 ? "#F59E0B" : "#EF4444";

  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: `${getColor(val)}18`, color: getColor(val), border: `1px solid ${getColor(val)}30` }}>
      {pct}%
    </span>
  );
}
