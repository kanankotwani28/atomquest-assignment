import { useState } from 'react';

export default function ReturnReasonModal({ isOpen, goalTitle, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Return goal for rework</h2>
        <p className="text-sm text-gray-500 mb-4">
          "{goalTitle}"
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for returning <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            placeholder="Explain what needs to be changed (e.g. target too low, wrong thrust area)..."
          />
          {!reason.trim() && (
            <p className="text-xs text-gray-400 mt-1">Required — employee will see this message</p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm
                       text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm
                       font-medium hover:bg-red-600 disabled:opacity-40 transition-colors">
            {loading ? 'Returning...' : 'Return to employee'}
          </button>
        </div>
      </div>
    </div>
  );
}