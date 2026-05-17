// Colour-codes scores so managers and employees can
// see at a glance which goals are on track vs struggling
export default function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 font-medium">
        No data
      </span>
    );
  }

  const pct = parseFloat(score).toFixed(1);

  const style =
    score >= 100 ? 'bg-green-100 text-green-700' :
    score >= 75  ? 'bg-blue-100 text-blue-700'   :
    score >= 50  ? 'bg-yellow-100 text-yellow-700':
                   'bg-red-100 text-red-600';

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${style}`}>
      {pct}%
    </span>
  );
}