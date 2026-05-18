export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span className="score-badge null">
        —
      </span>
    );
  }

  const val = parseFloat(score);
  const pct = val.toFixed(0);

  const styleClass =
    val >= 80 ? 'excellent' :
    val >= 60 ? 'good' :
    val >= 40 ? 'warn' :
                'poor';

  return (
    <span className={`score-badge ${styleClass}`}>
      {pct}%
    </span>
  );
}
