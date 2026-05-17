// Colour-codes scores so managers and employees can
// see at a glance which goals are on track vs struggling
export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span className="status-badge status-draft mono">
        No data
      </span>
    );
  }

  const pct = parseFloat(score).toFixed(1);

  const style =
    score >= 80 ? 'status-approved' :
    score >= 50 ? 'status-submitted':
                  'status-returned';

  return (
    <span className={`status-badge mono ${style}`}>
      {pct}%
    </span>
  );
}
