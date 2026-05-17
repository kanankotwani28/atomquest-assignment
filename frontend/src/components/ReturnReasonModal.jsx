import { useState } from "react";

export default function ReturnReasonModal({ isOpen, goalTitle, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
    setReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md p-6">
        <h2 className="mb-1 text-lg font-medium tracking-[0.01em]">Return goal for rework</h2>
        <p className="mb-4 text-sm text-[#888]">"{goalTitle}"</p>

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-[#888]">
            Reason for returning <span className="text-[#c47a7a]">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full resize-none px-4 py-3 text-sm"
            placeholder="Explain what needs to be changed..."
          />
          {!reason.trim() && <p className="mt-1 text-xs text-[#555]">Required; employee will see this message</p>}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn flex-1">Cancel</button>
          <button onClick={handleConfirm} disabled={!reason.trim() || loading} className="btn btn-danger-outline flex-1">
            {loading ? "Returning..." : "Return"}
          </button>
        </div>
      </div>
    </div>
  );
}
