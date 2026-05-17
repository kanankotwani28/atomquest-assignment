import { useState } from 'react';
import { addManagerComment } from '../api/checkins';
import ScoreBadge from './ScoreBadge';
import toast from 'react-hot-toast';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const STATUS_ICONS = {
  NOT_STARTED: '○',
  ON_TRACK:    '◑',
  COMPLETED:   '●',
};

export default function ManagerCheckInRow({ goal, onUpdated }) {
  const [commentingOn, setCommentingOn] = useState(null); // checkIn id
  const [comment, setComment]           = useState('');
  const [saving,  setSaving]            = useState(false);

  const checkInMap = {};
  for (const ci of goal.checkIns) checkInMap[ci.quarter] = ci;

  const saveComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await addManagerComment(commentingOn, comment);
      toast.success('Comment saved');
      setCommentingOn(null);
      setComment('');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save comment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Goal title */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{goal.title}</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            {goal.thrustArea?.name} · {goal.weightage}% · Target: {goal.target.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Quarter-by-quarter breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {QUARTERS.map(q => {
          const ci = checkInMap[q];
          return (
            <div key={q} className={`rounded-lg p-3 border text-center ${
              ci ? 'bg-gray-50 border-gray-200' : 'bg-white border-dashed border-gray-200'
            }`}>
              <p className="text-xs font-medium text-gray-500 mb-2">{q}</p>

              {ci ? (
                <>
                  {/* Planned vs Actual */}
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Plan</span>
                      <span className="text-gray-700 font-medium">
                        {goal.target.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Actual</span>
                      <span className="text-gray-900 font-semibold">
                        {goal.uomType === 'TIMELINE'
                          ? (ci.completionDate
                              ? new Date(ci.completionDate).toLocaleDateString()
                              : '—')
                          : (ci.actual !== null ? ci.actual?.toLocaleString() : '—')
                        }
                      </span>
                    </div>
                  </div>

                  <ScoreBadge score={ci.score} />

                  {/* Status icon */}
                  <p className="text-xs text-gray-500 mt-1">
                    {STATUS_ICONS[ci.progressStatus]} {ci.progressStatus.replace('_', ' ')}
                  </p>

                  {/* Comment button / display */}
                  {ci.managerComment ? (
                    <div className="mt-2 text-left">
                      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 leading-relaxed">
                        {ci.managerComment}
                      </p>
                      <button
                        onClick={() => { setCommentingOn(ci.id); setComment(ci.managerComment); }}
                        className="text-xs text-gray-400 hover:text-gray-600 mt-1">
                        Edit comment
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setCommentingOn(ci.id); setComment(''); }}
                      className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                      + Add comment
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-300 mt-4">No data</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Comment input inline */}
      {commentingOn && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Check-in comment
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Document your discussion — progress, blockers, guidance..."
            className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={saveComment} disabled={saving || !comment.trim()}
              className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-lg
                         hover:bg-indigo-700 disabled:opacity-40 transition-colors">
              {saving ? 'Saving...' : 'Save comment'}
            </button>
            <button
              onClick={() => { setCommentingOn(null); setComment(''); }}
              className="text-xs px-4 py-2 border border-gray-200 rounded-lg
                         text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}